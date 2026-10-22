/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { createInterface } from 'readline';
import { kibanaPackageJson } from '@kbn/repo-info';
import { createStackTraceResolver } from '@kbn/setup-node-env/source_maps';

import Command from '../command';

const program = new Command('bin/kibana-resolve-stack-trace');

program
  .version(kibanaPackageJson.version)
  .description('Resolves stack traces from this Kibana build to source locations')
  .action(async () => {
    // The installation this ships in, which REPO_ROOT isn't when run from inside another Kibana.
    const resolveStackTrace = createStackTraceResolver(Path.resolve(__dirname, '../../../..'));
    const prompt = process.stdin.isTTY;
    // Unlike raw stdin, a terminal prompt reads pasted lines of any length.
    const lines = createInterface({
      input: process.stdin,
      output: prompt ? process.stderr : undefined,
    });
    // Otherwise Ctrl-C only pauses the prompt.
    lines.on('SIGINT', () => lines.close());
    if (prompt) {
      console.error('Paste stack traces, then press Enter on an empty line. Press Ctrl-C to exit.');
    }

    // Resolving is line by line, so only the prompt waits for whole stack traces.
    let trace = [];
    const flush = () => {
      if (trace.length) {
        console.log(resolveStackTrace(trace.join('\n')));
      }
      trace = [];
    };
    for await (const line of lines) {
      trace.push(line);
      if (!prompt || !line) {
        flush();
      }
    }
    flush();
  });

program.parse(process.argv);
