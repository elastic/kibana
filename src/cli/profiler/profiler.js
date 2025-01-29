/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFile } from 'fs';
import getopts from 'getopts';
import { join } from 'path';
import { Session } from 'node:inspector';
import { threadId } from 'node:worker_threads';
import { promisify } from 'util';
import { Logger } from '../logger';

class Profiler {
  #counter = 0;
  #logger;
  #path;
  #session;

  constructor(logger) {
    const execOpts = getopts(process.execArgv);
    const envOpts = getopts(process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(/\s+/) : []);
    this.#path = execOpts['diagnostic-dir'] || envOpts['diagnostic-dir'] || process.cwd();
    this.#logger = logger;
  }

  #getPath() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const date = `${year}${month}${day}`;
    const time = `${hours}${minutes}${seconds}`;
    const pid = process.pid;
    const thread = threadId;
    const serial = (++this.#counter).toString().padStart(3, '0');

    return join(this.#path, `CPU.${date}.${time}.${pid}.${thread}.${serial}.cpuprofile`);
  }

  async #start() {
    this.#session = new Session();
    this.#session.connect();
    this.#session.post = this.#session.post.bind(this.#session);

    await promisify(this.#session.post)('Profiler.enable');
    await promisify(this.#session.post)('Profiler.start');
    this.#logger.log(`CPU profiling is started for process '${process.pid}'.`);
  }

  async #stop() {
    try {
      const { profile } = await promisify(this.#session.post)('Profiler.stop');
      this.#logger.log(`CPU profiling is stopped for process '${process.pid}'.`);

      const path = this.#getPath();
      await promisify(writeFile)(path, JSON.stringify(profile));
      this.#logger.log(`Saved CPU profile to '${path}'.`);
    } finally {
      this.#session.disconnect();
      this.#session = undefined;
    }
  }

  isRunning() {
    return this.#session !== undefined;
  }

  toggle() {
    return this.isRunning() ? this.#stop() : this.#start();
  }
}

export default function (program) {
  program
    .option('--profiler.signal <signal>', 'Start/stop CPU profiling on <signal>')
    .on('option:profiler.signal', function (signal) {
      if (!signal) {
        return;
      }

      const logger = new Logger();
      const profiler = new Profiler(logger);
      process.removeAllListeners(signal);
      process.on(signal, profiler.toggle.bind(profiler));
      logger.log(`CPU profiling is enabled on '${signal}' for process '${process.pid}'.`);
    });
}
