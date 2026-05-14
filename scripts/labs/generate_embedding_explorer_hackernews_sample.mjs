#!/usr/bin/env node

import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';
import { UMAP } from 'umap-js';

const SOURCE_URL =
  'https://clickhouse-datasets.s3.amazonaws.com/hackernews-miniLM/hackernews_part_1_of_1.parquet';
const SOURCE_BYTE_LENGTH = 59267912355;
const INDEX_DOCUMENTS_OUTPUT_PATH = resolve(
  'src/platform/plugins/private/labs/server/lab_apps/embedding_explorer/routes/hackernews_sample_index_documents.json'
);

const WINDOW_COUNT = 12;
const WINDOW_SIZE = 500;
const TARGET_POINT_COUNT = 2500;

const TYPE_LABELS = {
  1: 'story',
  2: 'comment',
  3: 'poll',
  4: 'pollopt',
  5: 'job',
};

const decodeHtml = (value) =>
  value
    .replace(/<a [^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, '/')
    .replace(/&#62;/g, '>')
    .replace(/&#60;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\s+/g, ' ')
    .trim();

const truncate = (value, maxLength) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;

const roundNumber = (value, digits = 6) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value;

const getCosineDistance = (left, right) => {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];

    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 1;
  }

  return 1 - dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

const getHash = (value) => {
  let hash = 2166136261;
  const stringValue = String(value);

  for (let index = 0; index < stringValue.length; index += 1) {
    hash ^= stringValue.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const getRanges = (numRows) => {
  const ranges = [];
  const maxStart = Math.max(0, numRows - WINDOW_SIZE);

  for (let index = 0; index < WINDOW_COUNT; index += 1) {
    const fraction = WINDOW_COUNT === 1 ? 0 : index / (WINDOW_COUNT - 1);
    const baseStart = Math.floor(maxStart * fraction);
    ranges.push(Math.min(maxStart, baseStart));
  }

  return Array.from(new Set(ranges));
};

const createRemoteFile = () =>
  asyncBufferFromUrl({
    url: SOURCE_URL,
    byteLength: SOURCE_BYTE_LENGTH,
  });

const readRowsForWindow = async (start, numRows) => {
  let attempt = 0;
  let lastError;

  while (attempt < 3) {
    try {
      const file = await createRemoteFile();
      return await parquetReadObjects({
        file,
        compressors,
        columns: [
          'id',
          'text',
          'vector',
          'type',
          'by',
          'time',
          'title',
          'post_score',
          'dead',
          'deleted',
          'length',
        ],
        rowStart: start,
        rowEnd: Math.min(numRows, start + WINDOW_SIZE),
      });
    } catch (error) {
      lastError = error;
      attempt += 1;
      console.warn(`window starting at ${start} failed on attempt ${attempt}: ${String(error)}`);
    }
  }

  throw lastError;
};

const buildLabel = (row, snippet) => {
  const title = truncate(decodeHtml(row.title ?? ''), 120);

  if (title) {
    return title;
  }

  if (Number(row.type) === 2 && row.by) {
    return truncate(`Comment by ${row.by}`, 120);
  }

  if (row.by) {
    return truncate(`${TYPE_LABELS[row.type] ?? 'post'} by ${row.by}`, 120);
  }

  return `${TYPE_LABELS[row.type] ?? 'post'} ${row.id}`;
};

const buildSummary = (row) => {
  const title = decodeHtml(row.title ?? '');
  const snippet = truncate(decodeHtml(row.text ?? ''), 220);

  if (title && snippet && !snippet.startsWith(title)) {
    return truncate(`${title} — ${snippet}`, 240);
  }

  return truncate(title || snippet || `${TYPE_LABELS[row.type] ?? 'post'} ${row.id}`, 240);
};

const isUsableRow = (row) => {
  if (Number(row.dead) !== 0 || Number(row.deleted) !== 0) {
    return false;
  }

  if (!Array.isArray(row.vector) || row.vector.length !== 384) {
    return false;
  }

  if (typeof row.text !== 'string' || row.text.trim() === '') {
    return false;
  }

  if (Number(row.length) < 40) {
    return false;
  }

  return true;
};

const main = async () => {
  const file = await createRemoteFile();

  const metadata = await parquetMetadataAsync(file);
  const numRows = Number(metadata.num_rows);
  const ranges = getRanges(numRows);
  const candidates = new Map();

  for (const [index, start] of ranges.entries()) {
    console.log(`reading window ${index + 1}/${ranges.length} starting at row ${start}`);
    const rows = await readRowsForWindow(start, numRows);

    for (const row of rows) {
      if (!isUsableRow(row) || candidates.has(row.id)) {
        continue;
      }

      const summary = buildSummary(row);
      const snippet = truncate(decodeHtml(row.text ?? ''), 160);
      const label = buildLabel(row, snippet);
      const category = TYPE_LABELS[row.type] ?? 'unknown';

      candidates.set(row.id, {
        id: String(row.id),
        vector: row.vector.map((value) => Number(value)),
        label,
        summary,
        category,
        source: 'clickhouse-hackernews-sample',
        document: {
          author: row.by ?? 'unknown',
          id: String(row.id),
          length: Number(row.length),
          score: Number(row.post_score ?? 0),
          summary,
          text: truncate(decodeHtml(row.text ?? ''), 1000),
          time: row.time,
          title: truncate(decodeHtml(row.title ?? ''), 160),
          type: category,
        },
        metadata: {
          author: row.by ?? 'unknown',
          length: Number(row.length),
          score: Number(row.post_score ?? 0),
          time: row.time,
          title: truncate(decodeHtml(row.title ?? ''), 160),
          type: category,
        },
      });
    }
  }

  const selectedRows = Array.from(candidates.values())
    .sort((left, right) => getHash(left.id) - getHash(right.id))
    .slice(0, TARGET_POINT_COUNT);

  if (selectedRows.length < TARGET_POINT_COUNT) {
    throw new Error(`Only collected ${selectedRows.length} usable rows`);
  }

  const vectors = selectedRows.map((row) => row.vector);
  const umap = new UMAP({
    distanceFn: getCosineDistance,
    minDist: 0.1,
    nComponents: 2,
    nNeighbors: Math.min(15, selectedRows.length - 1),
  });
  console.log(`running UMAP for ${selectedRows.length} points`);
  const embedding = await umap.fitAsync(vectors);

  const indexDocuments = {
    categoryField: 'type',
    datasetName: 'Sample Hacker News vector corpus',
    description:
      'A preprojected sample of Hacker News posts and comments derived from the ClickHouse vector search dataset.',
    indexNamePrefix: 'labs_embedding_hackernews_sample',
    labelField: 'summary',
    projectionFields: {
      x: 'projection.x',
      y: 'projection.y',
    },
    vectorField: 'embedding',
    docs: selectedRows.map((row, index) => ({
      ...row.document,
      embedding: row.vector.map((value) => roundNumber(value)),
      projection: {
        x: roundNumber(embedding[index][0]),
        y: roundNumber(embedding[index][1]),
      },
      source_dataset: row.source,
    })),
  };

  await mkdir(dirname(INDEX_DOCUMENTS_OUTPUT_PATH), { recursive: true });
  await writeFile(
    `${INDEX_DOCUMENTS_OUTPUT_PATH}`,
    `${JSON.stringify(indexDocuments, null, 2)}\n`,
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        indexDocumentsOutputPath: INDEX_DOCUMENTS_OUTPUT_PATH,
        pointCount: indexDocuments.docs.length,
        categories: indexDocuments.docs.reduce((acc, point) => {
          acc[point.type] = (acc[point.type] ?? 0) + 1;
          return acc;
        }, {}),
      },
      null,
      2
    )
  );
};

await main();
