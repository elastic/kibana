/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreemen Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'worker_threads';
import { MultiBar, SingleBar, Presets } from 'cli-progress';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import path from 'path';
import { createIndexInElasticsearch, createWorker, deleteWorker } from './utils';

export interface FunctionInfo {
  id: string;
  name: string;
  startLine: number;
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
  astFeatures: {};
  filePath: string;
}

const startTime = Date.now();

const debug = process.env.NODE_ENV === 'dev';

export async function generateAST() {
  console.log('Generating AST for Kibana files...');

  if (debug) deleteWorker();
  if (!debug) createWorker();

  console.log('hello?');
  await createIndexInElasticsearch();

  const packages = getPackages(REPO_ROOT);

  if (packages.length === 0) {
    console.log('No packages found in the repository.');
    return;
  }

  console.log(`Found ${packages.length} packages.`);

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

  packagesBar?.start(packages.length, 0, { name: 'Processing packages...' });

  // Run workers in parallel, but limit concurrency to avoid resource exhaustion
  const maxWorkers = 10;
  let running = 0;
  let idx = 0;
  let completed = 0;

  function runNext({ packageBar, map }: { packageBar: SingleBar; map: Map<string, true> }) {
    packageBar?.setTotal(0);

    if (idx >= packages.length) return;

    const { directory, id } = packages[idx++];

    packageBar?.update({ name: `Processing package ${id}...` });

    running++;

    const worker = new Worker(path.join(__dirname, 'process_package_worker'));

    worker.postMessage({
      action: 'processPackage',
      data: {
        directory,
        id,
        map: Array.from(map),
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
          if (msg.filePath in map === false) {
            map.set(msg.filePath, true);
          }
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
            stat: `❌ Worker error for ${id}: ${msg.error}`,
          });

          break;
        default:
          console.warn(`Unknown message type from worker: ${msg.type}`);
      }
    });

    worker.on('exit', () => {
      running--;

      if (completed >= packages.length) {
        progress.stop();
      } else {
        runNext({ packageBar, map });
      }
    });
  }

  const map = new Map<string, true>();
  // Start initial workers
  for (let i = 0; i < Math.min(maxWorkers, packages.length); i++) {
    const packageBar = progress.create(
      0,
      0,
      {},
      { autopadding: true, clearOnComplete: true, stopOnComplete: true, emptyOnZero: true }
    );

    runNext({ packageBar, map });
  }

  // Wait for all workers to finish
  while (completed < packages.length) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

generateAST().then(() => {
  const endTime = Date.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`AST generation completed in ${elapsedTime} seconds`);
});
