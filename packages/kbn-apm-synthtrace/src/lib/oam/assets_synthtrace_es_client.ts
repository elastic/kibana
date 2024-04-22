/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import {
  ApmFields,
  ESDocumentWithOperation,
  LogDocument,
  OAMAssetDocument,
} from '@kbn/apm-synthtrace-client';
import { PassThrough, pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { fork } from '../utils/stream_utils';
import { createLogsAssetsAggregator } from './aggregators/create_logs_assets_aggregator';
import { createTracesAssetsAggregator } from './aggregators/create_traces_assets_aggregator';

export type AssetsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class AssetsSynthtraceEsClient extends SynthtraceEsClient<OAMAssetDocument> {
  constructor(options: { client: Client; logger: Logger } & AssetsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: assetsPipeline(),
    });
    this.indices = ['assets'];
  }
}

function assetsPipeline() {
  return (base: Readable) => {
    const aggregators = [createTracesAssetsAggregator(), createLogsAssetsAggregator()];
    return pipeline(
      base,
      getSerializeTransform(),
      fork(new PassThrough({ objectMode: true }), ...aggregators),
      getAssetsFilterTransform(),
      getMergeAssetsTransform(),
      getRoutingTransform(),
      getDedotTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}

function getMergeAssetsTransform() {
  const mergedDocuments: Record<string, OAMAssetDocument> = {};
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OAMAssetDocument>, encoding, callback) {
      const assetId = document['asset.id'];
      if (!mergedDocuments[assetId]) {
        mergedDocuments[assetId] = { ...document };
      } else {
        mergedDocuments[assetId]['asset.signalTypes'].push(...document['asset.signalTypes']);
      }
      callback();
    },
    flush(callback) {
      Object.values(mergedDocuments).forEach((item) => this.push(item));
      callback();
    },
  });
}

function getAssetsFilterTransform() {
  return new Transform({
    objectMode: true,
    transform(
      document: ESDocumentWithOperation<OAMAssetDocument | ApmFields | LogDocument>,
      encoding,
      callback
    ) {
      if ('asset.id' in document) {
        callback(null, document);
      } else {
        callback();
      }
    },
  });
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OAMAssetDocument>, encoding, callback) {
      if ('asset.type' in document) {
        document._index = `assets`;
      } else {
        throw new Error(`Cannot determine index for event ${JSON.stringify(document)}`);
      }

      callback(null, document);
    },
  });
}
