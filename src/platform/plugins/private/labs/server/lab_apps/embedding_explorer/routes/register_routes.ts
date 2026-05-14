/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FieldCapsFieldCapability,
  IndicesCreateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import type {
  EmbeddingExplorerIndexDataResponse,
  EmbeddingExplorerIndexFieldsResponse,
  EmbeddingExplorerMetadataValue,
  EmbeddingExplorerSampleIndicesResponse,
} from '../../../../common';
import {
  EMBEDDING_EXPLORER_DEFAULT_INDEX_SAMPLE_SIZE,
  EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
  EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
  EMBEDDING_EXPLORER_INDICES_API_PATH,
  EMBEDDING_EXPLORER_LAB_ID,
  EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
} from '../../../../common';
import { fetchIndices } from '../../../lib/fetch_indices';
import { isLabInstalled } from '../../../lib/installed_labs';
import { getSampleIndexDocuments, type SampleIndexDocument } from './get_sample_index_documents';

const NUMERIC_FIELD_TYPES = new Set([
  'byte',
  'double',
  'float',
  'half_float',
  'integer',
  'long',
  'scaled_float',
  'short',
  'unsigned_long',
]);

const LABEL_FIELD_TYPES = new Set([
  'constant_keyword',
  'keyword',
  'match_only_text',
  'search_as_you_type',
  'text',
  'wildcard',
]);

const CATEGORY_FIELD_TYPES = new Set(['boolean', 'constant_keyword', 'keyword', 'wildcard']);
const SAMPLE_INDEX_BULK_SIZE = 250;

const CUSTOM_INDEX_PROJECTION_NOTICE = i18n.translate(
  'labs.embeddingExplorer.customIndexProjectionNoticeDescription',
  {
    defaultMessage:
      'If your index already includes two numeric projection fields, Atlas can render immediately without computing a client-side projection.',
  }
);

const RAW_VECTOR_PROJECTION_NOTICE = i18n.translate(
  'labs.embeddingExplorer.rawVectorProjectionNoticeDescription',
  {
    defaultMessage:
      'If projection fields are unavailable, this lab can sample dense vectors and compute a two-dimensional UMAP projection in the browser.',
  }
);

const getForbiddenInstallMessage = () =>
  i18n.translate('labs.embeddingExplorer.installRequiredErrorMessage', {
    defaultMessage: 'Install the Embedding explorer lab before using this API.',
  });

const getSampleIndexNames = () => {
  const asset = getSampleIndexDocuments();

  return {
    projectedIndex: `${asset.indexNamePrefix}_projected`,
    vectorOnlyIndex: `${asset.indexNamePrefix}_vectors_only`,
  };
};

const getSampleVectorDimensions = () => {
  const asset = getSampleIndexDocuments();
  const dimensions = asset.docs[0]?.embedding.length;

  if (!dimensions) {
    throw new Error(
      i18n.translate('labs.embeddingExplorer.sampleIndexDocumentsMissingVectorsErrorMessage', {
        defaultMessage:
          'The sample Elasticsearch setup artifact does not include any vector documents.',
      })
    );
  }

  if (!asset.docs.every((doc) => doc.embedding.length === dimensions)) {
    throw new Error(
      i18n.translate('labs.embeddingExplorer.sampleIndexDocumentsInvalidVectorsErrorMessage', {
        defaultMessage:
          'The sample Elasticsearch setup artifact contains inconsistent vector dimensions.',
      })
    );
  }

  return dimensions;
};

const getSampleIndicesResponse = async (
  client: ElasticsearchClient
): Promise<EmbeddingExplorerSampleIndicesResponse> => {
  const asset = getSampleIndexDocuments();
  const { projectedIndex, vectorOnlyIndex } = getSampleIndexNames();
  const [projectedExists, vectorOnlyExists] = await Promise.all([
    client.indices.exists({ index: projectedIndex }),
    client.indices.exists({ index: vectorOnlyIndex }),
  ]);

  return {
    categoryField: asset.categoryField,
    isReady: projectedExists && vectorOnlyExists,
    labelField: asset.labelField,
    projectedIndex,
    vectorField: asset.vectorField,
    vectorOnlyIndex,
    xField: asset.projectionFields.x,
    yField: asset.projectionFields.y,
  };
};

const getSampleIndexCreateBody = (
  includeProjection: boolean
): Pick<IndicesCreateRequest, 'mappings' | 'settings'> =>
  ({
    mappings: {
      dynamic: false,
      properties: {
        author: { type: 'keyword' },
        embedding: {
          dims: getSampleVectorDimensions(),
          index: true,
          similarity: 'cosine',
          type: 'dense_vector',
        },
        id: { type: 'keyword' },
        length: { type: 'integer' },
        score: { type: 'integer' },
        source_dataset: { type: 'keyword' },
        summary: { type: 'text' },
        text: { type: 'text' },
        time: { format: 'epoch_second||strict_date_optional_time', type: 'date' },
        title: { type: 'text' },
        type: { type: 'keyword' },
        ...(includeProjection
          ? {
              projection: {
                properties: {
                  x: { type: 'float' },
                  y: { type: 'float' },
                },
                type: 'object',
              },
            }
          : {}),
      },
    },
    settings: {
      index: {
        number_of_replicas: 0,
        number_of_shards: 1,
      },
    },
  } as Pick<IndicesCreateRequest, 'mappings' | 'settings'>);

const bulkIndexSampleDocuments = async (
  client: ElasticsearchClient,
  indexName: string,
  transformDocument: (
    document: SampleIndexDocument
  ) => Record<string, unknown> | SampleIndexDocument
) => {
  const { docs } = getSampleIndexDocuments();

  for (let offset = 0; offset < docs.length; offset += SAMPLE_INDEX_BULK_SIZE) {
    const chunk = docs.slice(offset, offset + SAMPLE_INDEX_BULK_SIZE);
    const operations: Array<Record<string, unknown>> = chunk.flatMap((document) => [
      {
        index: {
          _id: document.id,
          _index: indexName,
        },
      },
      transformDocument(document) as Record<string, unknown>,
    ]);

    const bulkResponse = await client.bulk({
      operations,
      refresh: false,
    });

    const firstError = (
      bulkResponse.items as
        | Array<{ index?: { error?: { reason?: string; type?: string } } }>
        | undefined
    )?.find((item) => item.index?.error)?.index?.error;

    if (bulkResponse.errors && firstError) {
      throw new Error(
        i18n.translate('labs.embeddingExplorer.sampleIndexBulkInsertErrorMessage', {
          defaultMessage: 'Bulk indexing the sample embeddings failed: {type}: {reason}',
          values: {
            reason: firstError.reason ?? 'unknown error',
            type: firstError.type ?? 'bulk_index_error',
          },
        })
      );
    }
  }

  await client.indices.refresh({ index: indexName });
};

const ensureSampleIndices = async (client: ElasticsearchClient) => {
  const { projectedIndex, vectorOnlyIndex } = getSampleIndexNames();
  const [projectedExists, vectorOnlyExists] = await Promise.all([
    client.indices.exists({ index: projectedIndex }),
    client.indices.exists({ index: vectorOnlyIndex }),
  ]);

  if (!projectedExists) {
    await client.indices.create({
      index: projectedIndex,
      ...getSampleIndexCreateBody(true),
    });
    await bulkIndexSampleDocuments(client, projectedIndex, (document) => document);
  }

  if (!vectorOnlyExists) {
    await client.indices.create({
      index: vectorOnlyIndex,
      ...getSampleIndexCreateBody(false),
    });
    await bulkIndexSampleDocuments(client, vectorOnlyIndex, (document) => {
      const { projection, ...vectorOnlyDocument } = document;
      return vectorOnlyDocument;
    });
  }

  return getSampleIndicesResponse(client);
};

const getSourceValue = (
  source: Record<string, unknown> | undefined,
  fieldName: string
): EmbeddingExplorerMetadataValue | undefined => {
  if (!source) {
    return undefined;
  }

  const value = fieldName.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, source);

  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : null;
};

const toFiniteNumber = (value: EmbeddingExplorerMetadataValue | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toStringValue = (value: EmbeddingExplorerMetadataValue | undefined) =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : undefined;

const getVectorValues = (
  fields: Record<string, unknown> | undefined,
  fieldName: string
): number[] | undefined => {
  if (!fields || !(fieldName in fields)) {
    return undefined;
  }

  const fieldValue = fields[fieldName];

  if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
    return undefined;
  }

  if (fieldValue.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return fieldValue as number[];
  }

  const firstValue = fieldValue[0];

  if (!Array.isArray(firstValue)) {
    return undefined;
  }

  return firstValue.every((value) => typeof value === 'number' && Number.isFinite(value))
    ? (firstValue as number[])
    : undefined;
};

const includesCapabilityType = (
  capability: Record<string, FieldCapsFieldCapability>,
  types: Set<string>
) => Object.keys(capability).some((type) => types.has(type));

const getFieldOptions = async (
  client: ElasticsearchClient,
  index: string
): Promise<EmbeddingExplorerIndexFieldsResponse> => {
  const fieldCapabilities = await client.fieldCaps({
    fields: '*',
    filters: '-metadata',
    include_unmapped: false,
    index,
  });

  const vectorFields: string[] = [];
  const projectionFields: string[] = [];
  const labelFields: string[] = [];
  const categoryFields: string[] = [];

  Object.entries(fieldCapabilities.fields).forEach(([fieldName, capability]) => {
    if (capability.dense_vector || capability.semantic_text) {
      vectorFields.push(fieldName);
    }

    if (includesCapabilityType(capability, NUMERIC_FIELD_TYPES)) {
      projectionFields.push(fieldName);
    }

    if (includesCapabilityType(capability, LABEL_FIELD_TYPES)) {
      labelFields.push(fieldName);
    }

    if (includesCapabilityType(capability, CATEGORY_FIELD_TYPES)) {
      categoryFields.push(fieldName);
    }
  });

  const sortFields = (values: string[]) =>
    Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

  return {
    index,
    vectorFields: sortFields(vectorFields),
    projectionFields: sortFields(projectionFields),
    labelFields: sortFields(labelFields),
    categoryFields: sortFields(categoryFields),
    projectionRequiredNotice: CUSTOM_INDEX_PROJECTION_NOTICE,
    rawVectorProjectionNotice: RAW_VECTOR_PROJECTION_NOTICE,
  };
};

const getIndexDataset = async (
  client: ElasticsearchClient,
  {
    categoryField,
    index,
    labelField,
    size,
    vectorField,
    xField,
    yField,
  }: {
    index: string;
    vectorField: string;
    xField?: string;
    yField?: string;
    labelField?: string;
    categoryField?: string;
    size: number;
  }
): Promise<EmbeddingExplorerIndexDataResponse> => {
  const requestedSourceFields = [xField, yField, labelField, categoryField].filter(
    (fieldName): fieldName is string => Boolean(fieldName)
  );
  const hasProjectionFields = Boolean(xField && yField);

  const response = await client.search<Record<string, unknown>>({
    fields: [vectorField],
    index,
    size,
    sort: ['_doc'],
    track_total_hits: false,
    _source: {
      includes: requestedSourceFields,
    },
    query: {
      bool: {
        filter: [
          { exists: { field: vectorField } },
          ...(xField ? [{ exists: { field: xField } }] : []),
          ...(yField ? [{ exists: { field: yField } }] : []),
        ],
      },
    },
  });

  const points = response.hits.hits.reduce<EmbeddingExplorerIndexDataResponse['points']>(
    (acc, hit) => {
      const source = hit._source;
      const vector = getVectorValues(
        hit.fields as Record<string, unknown> | undefined,
        vectorField
      );
      const x = xField ? toFiniteNumber(getSourceValue(source, xField)) : 0;
      const y = yField ? toFiniteNumber(getSourceValue(source, yField)) : 0;

      if (!vector) {
        return acc;
      }

      if (hasProjectionFields && (x === undefined || y === undefined)) {
        return acc;
      }

      const pointId = hit._id ?? `${index}-${acc.length + 1}`;
      const label = (labelField && toStringValue(getSourceValue(source, labelField))) || pointId;
      const category =
        (categoryField && toStringValue(getSourceValue(source, categoryField))) ||
        i18n.translate('labs.embeddingExplorer.uncategorizedLabel', {
          defaultMessage: 'Uncategorized',
        });

      acc.push({
        id: pointId,
        x: x ?? 0,
        y: y ?? 0,
        label,
        summary: label,
        category,
        source: index,
        metadata: {
          category,
          index,
          label,
          projectionSource: hasProjectionFields ? 'precomputed' : 'computed',
          vectorField,
        },
        vector,
      });

      return acc;
    },
    []
  );

  if (points.length === 0) {
    throw new Error(
      i18n.translate('labs.embeddingExplorer.emptyProjectedIndexErrorMessage', {
        defaultMessage:
          'No projected points were found for the selected index and fields. Verify that the chosen projection fields contain numeric coordinates.',
      })
    );
  }

  return {
    datasetName: index,
    description: i18n.translate('labs.embeddingExplorer.customIndexDescription', {
      defaultMessage:
        'Previewing projected points from a user-selected Elasticsearch index that already exposes vector embeddings.',
    }),
    index,
    points,
    projectionNote: hasProjectionFields
      ? CUSTOM_INDEX_PROJECTION_NOTICE
      : RAW_VECTOR_PROJECTION_NOTICE,
    projectionSource: hasProjectionFields ? 'precomputed' : 'computed',
    vectorField,
  };
};

export const registerEmbeddingExplorerRoutes = (router: IRouter) => {
  router.get(
    {
      path: EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'Labs installs are enforced per user inside the route handler.',
        },
      },
      validate: false,
    },
    async (context, _request, response) => {
      if (!(await isLabInstalled(context, EMBEDDING_EXPLORER_LAB_ID))) {
        return response.forbidden({ body: { message: getForbiddenInstallMessage() } });
      }

      try {
        const { client } = (await context.core).elasticsearch;
        const sampleIndices = await getSampleIndicesResponse(client.asCurrentUser);
        return response.ok({ body: sampleIndices });
      } catch (error) {
        return response.badRequest({
          body: {
            message:
              error instanceof Error
                ? error.message
                : i18n.translate('labs.embeddingExplorer.sampleIndexStatusErrorMessage', {
                    defaultMessage:
                      'Unable to inspect the sample Elasticsearch indices for this lab.',
                  }),
          },
        });
      }
    }
  );

  router.post(
    {
      path: EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'Labs installs are enforced per user inside the route handler.',
        },
      },
      validate: false,
    },
    async (context, _request, response) => {
      if (!(await isLabInstalled(context, EMBEDDING_EXPLORER_LAB_ID))) {
        return response.forbidden({ body: { message: getForbiddenInstallMessage() } });
      }

      try {
        const { client } = (await context.core).elasticsearch;
        const sampleIndices = await ensureSampleIndices(client.asCurrentUser);
        return response.ok({ body: sampleIndices });
      } catch (error) {
        return response.badRequest({
          body: {
            message:
              error instanceof Error
                ? error.message
                : i18n.translate('labs.embeddingExplorer.sampleIndexSetupErrorMessage', {
                    defaultMessage:
                      'Unable to load the sample embeddings into Elasticsearch for this lab.',
                  }),
          },
        });
      }
    }
  );

  router.get(
    {
      path: EMBEDDING_EXPLORER_INDICES_API_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'Labs installs are enforced per user inside the route handler.',
        },
      },
      validate: {
        query: schema.object({
          search_query: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      if (!(await isLabInstalled(context, EMBEDDING_EXPLORER_LAB_ID))) {
        return response.forbidden({ body: { message: getForbiddenInstallMessage() } });
      }

      const { client } = (await context.core).elasticsearch;
      const indices = await fetchIndices(client.asCurrentUser, request.query.search_query);

      return response.ok({
        body: {
          indices: indices.slice(0, 200).map((name) => ({ name })),
        },
      });
    }
  );

  router.post(
    {
      path: EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'Labs installs are enforced per user inside the route handler.',
        },
      },
      validate: {
        body: schema.object({
          index: schema.string({ minLength: 1, maxLength: 512 }),
        }),
      },
    },
    async (context, request, response) => {
      if (!(await isLabInstalled(context, EMBEDDING_EXPLORER_LAB_ID))) {
        return response.forbidden({ body: { message: getForbiddenInstallMessage() } });
      }

      const { client } = (await context.core).elasticsearch;
      const fields = await getFieldOptions(client.asCurrentUser, request.body.index);
      return response.ok({ body: fields });
    }
  );

  router.post(
    {
      path: EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'Labs installs are enforced per user inside the route handler.',
        },
      },
      validate: {
        body: schema.object({
          index: schema.string({ minLength: 1, maxLength: 512 }),
          vectorField: schema.string({ minLength: 1, maxLength: 512 }),
          xField: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          yField: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          labelField: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          categoryField: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          size: schema.number({
            defaultValue: EMBEDDING_EXPLORER_DEFAULT_INDEX_SAMPLE_SIZE,
            min: 25,
            max: EMBEDDING_EXPLORER_DEFAULT_INDEX_SAMPLE_SIZE,
          }),
        }),
      },
    },
    async (context, request, response) => {
      if (!(await isLabInstalled(context, EMBEDDING_EXPLORER_LAB_ID))) {
        return response.forbidden({ body: { message: getForbiddenInstallMessage() } });
      }

      const { client } = (await context.core).elasticsearch;

      try {
        const data = await getIndexDataset(client.asCurrentUser, request.body);
        return response.ok({ body: data });
      } catch (error) {
        return response.badRequest({
          body: {
            message:
              error instanceof Error
                ? error.message
                : i18n.translate('labs.embeddingExplorer.indexDataRequestFailedErrorMessage', {
                    defaultMessage: 'Unable to fetch projected index data for this lab.',
                  }),
          },
        });
      }
    }
  );
};
