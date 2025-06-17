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
import { AUTH, ES_HOST, INDEX_NAME } from '.';

export function createWorker(
  log: ToolingLog,
  { es, index, auth }: { es: string; index: string; auth: string }
) {
  deleteWorker(log);

  log.info('Creating worker...');

  const inputPath = path.join(__dirname, 'process_package.ts');
  let source = readFileSync(inputPath, 'utf-8');

  // Replace placeholder
  source = source.replaceAll("'__ES_HOST__'", JSON.stringify(es));
  source = source.replaceAll("'__INDEX_NAME__'", JSON.stringify(index));
  source = source.replaceAll("'__AUTH__'", JSON.stringify(auth));

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
  if (existsSync(path.join(__dirname, 'worker.js'))) {
    log.info('Deleting worker...');
    unlinkSync(path.join(__dirname, 'worker.js'));
  }
}

export async function createIndexInElasticsearch(log: ToolingLog) {
  const indexExists = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
    method: 'HEAD',
    headers: {
      Authorization: `Basic ${AUTH}`,
    },
  });

  if (indexExists.status === 200) {
    log.info(`Index ${INDEX_NAME} already exists.`);

    const deleteIndexResponse = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${AUTH}`,
      },
    });
    if (!deleteIndexResponse.ok) {
      throw new Error(
        `Failed to delete index ${INDEX_NAME}: [${deleteIndexResponse.statusText}]:
        ${await deleteIndexResponse.json()}`
      );
    }

    log.info(`Index ${INDEX_NAME} deleted successfully.`);
  }

  const createIndexResponse = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${AUTH}`,
    },
    body: JSON.stringify({
      mappings: {
        properties: {
          name: { type: 'text' },
          verb: { type: 'text' },
          noun: { type: 'text' },
          param_count: { type: 'integer' },
          param_names: { type: 'keyword' },
          param_types: { type: 'keyword' },
          return_type: { type: 'text' },
          has_side_effects: { type: 'boolean' },
          functionDescription: {
            type: 'semantic_text',
          },
        },
      },
      settings: {
        'index.mapping.total_fields.limit': 100000,
        'index.mapping.depth.limit': 100,
      },
    }),
  });

  if (!createIndexResponse.ok) {
    log.error(
      new Error(
        `Failed to create index ${INDEX_NAME}: [${createIndexResponse.statusText}]:
      ${await createIndexResponse.json()}`
      )
    );
  }

  log.info(`Index ${INDEX_NAME} created successfully.`);
}
