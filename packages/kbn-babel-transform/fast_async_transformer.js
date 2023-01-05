/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Piscina = require('piscina');

/**
 * @param {import('./types').TransformConfig} config
 * @param {(transform: import('./types').Transform) => Promise<void>} block
 * @returns {Promise<void>}
 */
async function withFastAsyncTransform(config, block) {
  /** @type {import('./types').WorkerData} */
  const workerData = {
    config,
  };

  const pool = new Piscina({
    filename: require.resolve('./fast_async_worker.mjs'),
    idleTimeout: 200,
    workerData,
  });

  /** @type {import('./types').Transform} */
  const transform = async (path, source) => {
    /** @type {import('./types').WorkerTask} */
    const task = {
      path,
      source,
    };
    return await pool.run(task);
  };

  let success = false;
  try {
    await block(transform);
    success = true;
  } finally {
    try {
      await pool.destroy();
    } catch (error) {
      if (success === true) {
        console.error(`Failure closing piscina pool: ${error.stack}`);
      }
    }
  }
}

module.exports = { withFastAsyncTransform };
