#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { resolve } from 'path';

const INDEX_DOCUMENTS_PATH = resolve(
  'src/platform/plugins/private/labs/server/lab_apps/embedding_explorer/routes/hackernews_sample_index_documents.json'
);
const DEFAULT_ES_URL = process.env.ELASTICSEARCH_URL ?? process.env.ES_URL ?? 'http://localhost:9200';
const DEFAULT_USERNAME = process.env.ELASTICSEARCH_USERNAME ?? process.env.ES_USERNAME ?? 'elastic';
const DEFAULT_PASSWORD = process.env.ELASTICSEARCH_PASSWORD ?? process.env.ES_PASSWORD ?? 'changeme';
const BULK_BATCH_SIZE = 250;

const parseArgs = (argv) =>
  argv.reduce((acc, entry) => {
    if (!entry.startsWith('--')) {
      return acc;
    }

    const [rawKey, rawValue] = entry.slice(2).split('=');
    acc[rawKey] = rawValue ?? 'true';
    return acc;
  }, {});

const args = parseArgs(process.argv.slice(2));
const elasticsearchUrl = args.url ?? DEFAULT_ES_URL;
const username = args.username ?? DEFAULT_USERNAME;
const password = args.password ?? DEFAULT_PASSWORD;

const getAuthHeader = () => {
  if (!username || !password) {
    return {};
  }

  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    authorization: `Basic ${token}`,
  };
};

const request = async (method, path, body, extraHeaders = {}, allow404 = false) => {
  const response = await fetch(`${elasticsearchUrl}${path}`, {
    method,
    body,
    headers: {
      ...getAuthHeader(),
      ...extraHeaders,
    },
  });

  if (allow404 && response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`${method} ${path} failed (${response.status}): ${responseText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const createIndexBody = ({ includeProjection }) => ({
  mappings: {
    dynamic: false,
    properties: {
      author: { type: 'keyword' },
      embedding: {
        dims: 384,
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
});

const recreateIndex = async (indexName, body) => {
  await request('DELETE', `/${encodeURIComponent(indexName)}`, undefined, undefined, true);
  await request('PUT', `/${encodeURIComponent(indexName)}`, JSON.stringify(body), {
    'content-type': 'application/json',
  });
};

const bulkLoad = async (indexName, docs, transformDoc) => {
  for (let offset = 0; offset < docs.length; offset += BULK_BATCH_SIZE) {
    const batch = docs.slice(offset, offset + BULK_BATCH_SIZE);
    const ndjson = `${batch
      .map((doc) =>
        [
          JSON.stringify({ index: { _id: doc.id, _index: indexName } }),
          JSON.stringify(transformDoc(doc)),
        ].join('\n')
      )
      .join('\n')}\n`;

    const response = await request('POST', '/_bulk', ndjson, {
      'content-type': 'application/x-ndjson',
    });

    if (response?.errors) {
      const failedItem = response.items?.find((item) => item.index?.error);
      throw new Error(
        `bulk load failed for ${indexName}: ${JSON.stringify(failedItem?.index?.error ?? response)}`
      );
    }

    console.log(
      `loaded ${Math.min(offset + BULK_BATCH_SIZE, docs.length)}/${docs.length} docs into ${indexName}`
    );
  }

  await request('POST', `/${encodeURIComponent(indexName)}/_refresh`);
};

const main = async () => {
  const artifact = JSON.parse(await readFile(INDEX_DOCUMENTS_PATH, 'utf8'));
  const projectedIndex =
    args['projected-index'] ?? `${artifact.indexNamePrefix ?? 'labs_embedding_hackernews_sample'}_projected`;
  const vectorsOnlyIndex =
    args['vectors-only-index'] ??
    `${artifact.indexNamePrefix ?? 'labs_embedding_hackernews_sample'}_vectors_only`;

  console.log(`loading artifact from ${INDEX_DOCUMENTS_PATH}`);
  console.log(`target Elasticsearch: ${elasticsearchUrl}`);

  await recreateIndex(projectedIndex, createIndexBody({ includeProjection: true }));
  await recreateIndex(vectorsOnlyIndex, createIndexBody({ includeProjection: false }));

  await bulkLoad(projectedIndex, artifact.docs, (doc) => doc);
  await bulkLoad(vectorsOnlyIndex, artifact.docs, ({ projection, ...doc }) => doc);

  const projectedCount = await request(
    'GET',
    `/${encodeURIComponent(projectedIndex)}/_count`,
    undefined,
    undefined
  );
  const vectorsOnlyCount = await request(
    'GET',
    `/${encodeURIComponent(vectorsOnlyIndex)}/_count`,
    undefined,
    undefined
  );

  console.log(
    JSON.stringify(
      {
        categoryField: artifact.categoryField,
        docsPath: INDEX_DOCUMENTS_PATH,
        labelField: artifact.labelField,
        projected: {
          count: projectedCount?.count,
          index: projectedIndex,
          vectorField: artifact.vectorField,
          xField: artifact.projectionFields?.x,
          yField: artifact.projectionFields?.y,
        },
        vectorOnly: {
          count: vectorsOnlyCount?.count,
          index: vectorsOnlyIndex,
          vectorField: artifact.vectorField,
        },
      },
      null,
      2
    )
  );
};

await main();
