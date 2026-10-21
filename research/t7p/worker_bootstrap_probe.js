'use strict';

const { parentPort } = require('worker_threads');
const { getHeapStatistics } = require('v8');

parentPort.postMessage({ heapSizeLimit: getHeapStatistics().heap_size_limit });
