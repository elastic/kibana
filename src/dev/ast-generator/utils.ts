/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import path from 'path';
import { unlinkSync } from 'fs';
import { createProgram } from 'typescript';

const ES_HOST = 'http://localhost:9200';
const INDEX_NAME = 'kibana-ast';
const AUTH = Buffer.from('elastic:changeme').toString('base64');

export function createWorker() {
  deleteWorker();

  console.log('Creating worker...');

  const program = createProgram([`${__dirname}/process_package_worker.ts`], {});

  const workerSourceFile = program.getSourceFile(`${__dirname}/process_package_worker.ts`);

  if (workerSourceFile) {
    program.emit(workerSourceFile);
  }
}

export function deleteWorker() {
  console.log('Deleting worker...');

  unlinkSync(path.join(__dirname, 'process_package_worker.js'));
}

export async function createIndexInElasticsearch() {
  const indexExists = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
    method: 'HEAD',
    headers: {
      Authorization: `Basic ${AUTH}`,
    },
  });

  if (indexExists.status === 200) {
    console.log(`Index ${INDEX_NAME} already exists.`);

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

    console.log(`Index ${INDEX_NAME} deleted successfully.`);
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
    throw new Error(
      `Failed to create index ${INDEX_NAME}: [${createIndexResponse.statusText}]:
      ${await createIndexResponse.json()}`
    );
  }

  console.log(`Index ${INDEX_NAME} created successfully.`);
}
