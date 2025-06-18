/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { createProgram } from 'typescript';
import { ToolingLog } from '@kbn/tooling-log';
import { AUTH, ES_HOST, AST_INDEX_NAME, STATS_INDEX_NAME } from '.';
import { PackageStats } from './process_package';

export function createWorker(
  log: ToolingLog,
  {
    es,
    auth,
    astIndex,
    statsIndex,
  }: { es: string; auth: string; astIndex: string; statsIndex: string }
) {
  deleteWorker(log);

  log.info('Creating worker...');

  const inputPath = path.join(__dirname, 'process_package.ts');

  let source = readFileSync(inputPath, 'utf-8');

  // Replace placeholder
  source = source.replaceAll("'__ES_HOST__'", JSON.stringify(es));
  source = source.replaceAll("'__AUTH__'", JSON.stringify(auth));

  source = source.replaceAll("'__AST_INDEX_NAME__'", JSON.stringify(astIndex));
  source = source.replaceAll("'__STATS_INDEX_NAME__'", JSON.stringify(statsIndex));

  const tempPath = path.join(__dirname, 'worker.ts');

  writeFileSync(tempPath, source);

  const program = createProgram([`${__dirname}/worker.ts`], {});

  const workerSourceFile = program.getSourceFile(`${__dirname}/worker.ts`);

  if (workerSourceFile) {
    program.emit(workerSourceFile);
    unlinkSync(tempPath);
  }
}

export function deleteWorker(log: ToolingLog) {
  const worker = path.join(__dirname, 'worker.js');

  if (existsSync(worker)) {
    log.info('Deleting worker...');
    unlinkSync(worker);
  }
}

type StatIndexProperties = {
  [K in keyof PackageStats]: { type: 'text' | 'integer' | 'boolean' | 'semantic_text' };
};

export async function createIndicesInElasticsearch(log: ToolingLog) {
  await deleteIndex({ index: AST_INDEX_NAME, log });
  await deleteIndex({ index: STATS_INDEX_NAME, log });

  await createIndex({
    index: AST_INDEX_NAME,
    mappings: {
      properties: {
        id: { type: 'text' },
        name: { type: 'text' },
        filePath: { type: 'text' },
        line: { type: 'integer' },
        fullText: { type: 'text' },
        normalizedCode: { type: 'text' },
        returnType: { type: 'text' },
        returnsJSX: { type: 'boolean' },
        functionDescription: {
          type: 'semantic_text',
        },
      },
    },
    log,
  });

  const properties: StatIndexProperties = {
    id: { type: 'text' },
    name: { type: 'text' },
    filePath: { type: 'text' },
    totalFilesInPackage: { type: 'integer' },
    totalFunctionsInPackage: { type: 'integer' },
    totalSourceFiles: { type: 'integer' },
    skippedFiles: { type: 'integer' },
    timeToProcess: { type: 'integer' },
    timeToCompile: { type: 'integer' },
  };

  await createIndex({
    index: STATS_INDEX_NAME,
    mappings: {
      properties,
    },
    log,
  });
}

async function createIndex({
  index,
  mappings,
  log,
}: {
  index: string;
  mappings: Record<string, any>;
  log: ToolingLog;
}) {
  const createIndexResponse = await fetch(`${ES_HOST}/${index}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${AUTH}`,
    },
    body: JSON.stringify({
      mappings,
    }),
  });

  if (!createIndexResponse.ok) {
    log.error(
      new Error(
        `Failed to create index ${index}: [${createIndexResponse.statusText}]:
      ${await createIndexResponse.json()}`
      )
    );
  }

  log.info(`Index ${index} created successfully.`);
}

async function deleteIndex({ index, log }: { index: string; log: ToolingLog }) {
  log.info(`Deleting index ${index}...`);

  return fetch(`${ES_HOST}/${index}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${AUTH}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to delete index ${index}: ${res.statusText}`);
      }
      log.info(`Index ${index} deleted successfully.`);
    })
    .catch((err) => {
      log.error(err);
    });
}
