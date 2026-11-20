/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type {
  EdotBrowserSpanDocument,
  EdotReactNativeSpanDocument,
  ESDocumentWithOperation,
  Fields,
  OtelLogDocument,
} from '@kbn/synthtrace-client';
import type { Readable } from 'stream';
import { pipeline, Transform } from 'stream';
import type { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { SynthtraceEsClientBase } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import type { Logger } from '../utils/create_logger';

export type OtelDocument = OtelLogDocument | EdotBrowserSpanDocument | EdotReactNativeSpanDocument;

export interface OtelSynthtraceEsClient extends SynthtraceEsClient<OtelDocument> {
  installBrowserIndexTemplates(): Promise<void>;
}

export type OtelSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

interface Pipeline {
  includeSerialization?: boolean;
}

interface DataStreamFields {
  type?: string;
  dataset?: string;
  namespace?: string;
}

type RoutableDocument = Fields & {
  _index?: string;
  data_stream?: DataStreamFields;
  'data_stream.type'?: string;
  'data_stream.dataset'?: string;
  'data_stream.namespace'?: string;
};

/** Returns the explicit `_index` of an OTel document, or derives it from its `data_stream` fields. */
export const getOtelDocumentIndex = (document: RoutableDocument): string => {
  if (document._index) {
    return document._index;
  }

  const type = document.data_stream?.type ?? document['data_stream.type'];
  const dataset = document.data_stream?.dataset ?? document['data_stream.dataset'];
  const namespace = document.data_stream?.namespace ?? document['data_stream.namespace'];
  if (type && dataset && namespace) {
    return `${type}-${dataset}-${namespace}`;
  }

  throw new Error('Cannot determine index for event');
};

const getOtelRoutingTransform = () =>
  new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OtelDocument>, encoding, callback) {
      try {
        document._index = getOtelDocumentIndex(document);
        callback(null, document);
      } catch (error) {
        callback(error);
      }
    },
  });

const BROWSER_INDEX_SORT: estypes.IndicesIndexSegmentSort = {
  field: ['resource.attributes.service.name', 'attributes.session.id', '@timestamp'],
  order: ['asc', 'asc', 'desc'],
};

// Sort fields must be mapped when the index is created. Dotted names merge into the passthrough
// objects of the OTel templates, where an `attributes` or `resource` object would replace them.
const BROWSER_SORT_FIELD_MAPPINGS: Record<string, estypes.MappingProperty> = {
  'resource.attributes.service.name': { type: 'keyword', ignore_above: 1024 },
  'attributes.session.id': { type: 'keyword', ignore_above: 1024 },
};

const BROWSER_TEMPLATE_TYPES = ['logs', 'traces'] as const;
const browserTemplateName = (type: (typeof BROWSER_TEMPLATE_TYPES)[number]): string =>
  `synthtrace-${type}-browser.otel`;

/**
 * Indexes OTel-native documents as-is: no OTel to APM translation, no metric aggregation.
 * Documents are routed by `_index` or their `data_stream` fields.
 */
export class OtelSynthtraceEsClientImpl
  extends SynthtraceEsClientBase<OtelDocument>
  implements OtelSynthtraceEsClient
{
  constructor(
    options: { client: Client; logger: Logger; pipeline?: Pipeline } & OtelSynthtraceEsClientOptions
  ) {
    super({
      ...options,
      pipeline: otelPipeline({ includeSerialization: options.pipeline?.includeSerialization }),
    });
    this.dataStreams = ['logs-*.otel-*', 'traces-*.otel-*'];
  }

  /**
   * Sorts the EDOT Browser datasets by application, session and time, as elastic/observability-dev#6361
   * proposes for them. Copies the OTel templates of the cluster, so the data maps as it would in
   * `generic`. Without them, the data streams take the OTel templates' host and time sort.
   */
  async installBrowserIndexTemplates(): Promise<void> {
    await Promise.all(
      BROWSER_TEMPLATE_TYPES.map(async (type) => {
        const name = browserTemplateName(type);
        try {
          const {
            index_templates: [stock],
          } = await this.client.indices.getIndexTemplate({ name: `${type}-otel@template` });
          const {
            template,
            composed_of,
            ignore_missing_component_templates,
            data_stream,
            priority,
          } = stock.index_template;
          await this.client.indices.putIndexTemplate({
            name,
            index_patterns: [`${type}-browser.otel-*`],
            // Overlapping templates of the same priority are rejected.
            priority: (priority ?? 0) + 1,
            composed_of,
            ignore_missing_component_templates:
              typeof ignore_missing_component_templates === 'string'
                ? [ignore_missing_component_templates]
                : ignore_missing_component_templates,
            data_stream,
            template: {
              ...template,
              settings: { ...template?.settings, sort: BROWSER_INDEX_SORT },
              mappings: {
                ...template?.mappings,
                properties: { ...template?.mappings?.properties, ...BROWSER_SORT_FIELD_MAPPINGS },
              },
            },
          });
          this.logger.info(`Created index template "${name}"`);
        } catch (error) {
          this.logger.warning(`Failed to create index template "${name}": ${error}`);
        }
      })
    );
  }

  override async clean(): Promise<void> {
    await super.clean();
    // Otherwise every later browser data stream would keep the session sort.
    await Promise.all(
      BROWSER_TEMPLATE_TYPES.map(async (type) => {
        const name = browserTemplateName(type);
        await this.client.indices.deleteIndexTemplate({ name }, { ignore: [404] });
        this.logger.info(`Deleted index template "${name}"`);
      })
    );
  }
}

function otelPipeline({ includeSerialization = true }: Pipeline) {
  return (base: Readable) => {
    const onError = (err: NodeJS.ErrnoException | null) => {
      if (err) {
        throw err;
      }
    };

    return includeSerialization
      ? pipeline(base, getSerializeTransform<OtelDocument>(), getOtelRoutingTransform(), onError)
      : pipeline(base, getOtelRoutingTransform(), onError);
  };
}
