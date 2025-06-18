/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { Worker } from 'worker_threads';
import { MultiBar, SingleBar, Presets } from 'cli-progress';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { createIndicesInElasticsearch, createWorker, deleteWorker } from './utils';

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

export const ES_HOST = process.env.ES_HOST || 'http://localhost:9200';
const USER = process.env.ES_USER || 'elastic';
const PW = process.env.ES_PW || 'changeme';
export const AUTH = Buffer.from(`${USER}:${PW}`).toString('base64');

export const AST_INDEX_NAME = 'kibana-ast';
export const STATS_INDEX_NAME = 'kibana-ast-stats';

log.info(`Using Elasticsearch host: ${ES_HOST}`);
log.info(`Using authentication: ${USER}:${PW}`);

export interface FunctionInfo {
  id: string;
  name: string;
  line: number;
  parameters:
    | Array<{
        name: string;
        type: string | undefined;
        optional: boolean;
      }>
    | undefined;
  returnType: string | undefined;
  fullText: string;
  normalizedCode: string;
  filePath: string;
  returnsJSX: boolean;
}

const startTime = Date.now();

const debug = process.env.NODE_ENV === 'dev';

export async function generateAST() {
  log.info('Generating AST for Kibana files...');

  if (debug) deleteWorker(log);
  if (!debug)
    createWorker(log, {
      es: ES_HOST,
      auth: AUTH,
      astIndex: AST_INDEX_NAME,
      statsIndex: STATS_INDEX_NAME,
    });

  await createIndicesInElasticsearch(log);

  const packages = getPackages(REPO_ROOT);

  if (packages.length === 0) {
    log.error('No packages found in the repository.');
    return;
  }

  log.info(`Found ${packages.length} packages.`);

  const processedFilesMap = new Map<string, true>();

  const progress = new MultiBar(
    {
      format: '{bar} | {value}/{total} | {duration_formatted} | {eta_formatted} | {name} | {stat}',
      forceRedraw: true,
      stopOnComplete: true,
      clearOnComplete: true,
      autopadding: true,
      fps: 60,
    },
    Presets.shades_classic
  );

  const packagesBar = progress.create(packages.length, 0, {
    name: 'Packages',
    stat: '',
  });

  packagesBar?.start(packages.length, 0, { name: 'Processing packages...', stat: '' });

  // Run workers in parallel, but limit concurrency to avoid resource exhaustion
  const maxWorkers = 12;
  let running = 0;
  let idx = 0;
  let completed = 0;

  const activeWorkers = new Set<Worker>();

  log.info(`Using ${maxWorkers} workers.`);

  function broadcastProcessedFile(fileName: string) {
    processedFilesMap.set(fileName, true);

    // Notify all active workers about the processed file
    activeWorkers.forEach((worker) => {
      worker.postMessage({
        action: 'fileProcessed',
        data: { fileName },
      });
    });
  }

  function runNext({ packageBar }: { packageBar: SingleBar }) {
    packageBar?.setTotal(0);

    if (idx >= packages.length) return;

    const { directory, id } = packages[idx++];

    packageBar?.update({ name: `Processing package ${id}...` });

    running++;

    // Worker file is created in /utils
    const worker = new Worker(path.join(__dirname, 'worker'));

    activeWorkers.add(worker);

    const arrayedMap = Array.from(processedFilesMap.entries());

    worker.postMessage({
      action: 'processPackage',
      data: {
        directory,
        id,
        map: arrayedMap,
      },
    });

    worker.on('message', (msg) => {
      switch (msg.type) {
        case 'create':
          packageBar.start(0, 0, { name: id, stat: `🚀 ${msg.msg}` });
          break;

        case 'total':
          packageBar.setTotal(msg.total);
          break;

        case 'update':
          packageBar.update({ name: id, stat: `🚀 ${msg.msg || ''}` });
          break;

        case 'total':
          packageBar.setTotal(msg.total);
          break;

        case 'processFile':
          broadcastProcessedFile(msg.fileName);

          packageBar.increment(1, { name: id, stat: msg.msg || '' });
          break;

        case 'foundDuplicate':
          packageBar.update({
            stat: `⚠️ Duplicate file found: ${msg.filePath}`,
          });
          break;

        case 'done':
          completed++;

          packageBar.stop();
          packageBar.update({ stat: `✅ Completed processing ${id}.` });

          packagesBar.increment(1, { stat: `✅ Processed ${id}.` });
          break;

        case 'error':
          completed++;

          packagesBar.increment(1, {
            name: id,
            stat: `❌ Worker error for ${id}: ${msg.msg}`,
          });
          break;

        default:
          log.warning(`Unknown message type from worker: ${msg.type}`);
      }
    });

    worker.on('exit', () => {
      activeWorkers.delete(worker);
      running--;

      if (completed >= packages.length) {
        progress.stop();
      } else {
        runNext({ packageBar });
      }
    });
  }

  // Start initial workers
  for (let i = 0; i < Math.min(maxWorkers, packages.length); i++) {
    const packageBar = progress.create(
      0,
      0,
      {},
      { autopadding: true, clearOnComplete: true, stopOnComplete: true, emptyOnZero: true }
    );

    runNext({ packageBar });
  }

  // Wait for all workers to finish
  while (completed < packages.length) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

generateAST().then(() => {
  const endTime = Date.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
  log.info(`AST generation completed in ${elapsedTime} seconds`);
});
