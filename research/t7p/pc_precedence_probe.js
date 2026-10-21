'use strict';

const { Worker } = require('worker_threads');
const { getHeapStatistics, setFlagsFromString } = require('v8');
const { writeFileSync } = require('fs');

writeFileSync(
  '/tmp/t7p-heap-worker.js',
  `'use strict';
const { parentPort } = require('worker_threads');
const { getHeapStatistics } = require('v8');
parentPort.postMessage(getHeapStatistics().heap_size_limit);
`
);

const once = (options) =>
  new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker('/tmp/t7p-heap-worker.js', options);
    } catch (error) {
      resolve({ threw: error.code || error.message });
      return;
    }
    worker.once('message', (heapSizeLimit) => {
      worker.terminate();
      resolve({ heapSizeLimit });
    });
    worker.once('error', (error) => {
      resolve({ error: error.code || error.message });
    });
  });

const main = async () => {
  const parentBefore = getHeapStatistics().heap_size_limit;
  const resourceLimits = await once({ resourceLimits: { maxOldGenerationSizeMb: 128 } });
  const execArgv = await once({ execArgv: ['--max-old-space-size=256'] });
  const envFlag = await once({
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=256' },
    resourceLimits: { maxOldGenerationSizeMb: 128 },
  });
  setFlagsFromString('--max-old-space-size=256');
  const parentAfter = getHeapStatistics().heap_size_limit;
  const afterGlobalFlag = await once({});
  process.stdout.write(
    JSON.stringify({
      node: process.version,
      pointerCompression: process.config.variables.v8_enable_pointer_compression === 1,
      parentBefore,
      resourceLimits,
      execArgv,
      envFlag,
      parentAfter,
      afterGlobalFlag,
    })
  );
};

main();
