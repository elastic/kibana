/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { pickLevelFromFlags, ToolingLog } from '@kbn/dev-utils';
import { createFlagError, isFailError } from './fail';
import { Flags, getFlags, getHelp } from './flags';

type RunFn = (args: { log: ToolingLog; flags: Flags }) => Promise<void> | void;

export interface Options {
  usage?: string;
  description?: string;
  flags?: {
    allowUnexpected?: boolean;
    help?: string;
    alias?: { [key: string]: string | string[] };
    boolean?: string[];
    string?: string[];
    default?: { [key: string]: any };
  };
}

export async function run(fn: RunFn, options: Options = {}) {
  const flags = getFlags(process.argv.slice(2), options);
  const allowUnexpected = options.flags ? options.flags.allowUnexpected : false;

  if (flags.help) {
    process.stderr.write(getHelp(options));
    process.exit(1);
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags),
    writeTo: process.stdout,
  });

  try {
    if (!allowUnexpected && flags.unexpected.length) {
      throw createFlagError(`Unknown flag(s) "${flags.unexpected.join('", "')}"`);
    }

    await fn({ log, flags });
  } catch (error) {
    if (isFailError(error)) {
      log.error(error.message);

      if (error.showHelp) {
        log.write(getHelp(options));
      }

      process.exit(error.exitCode);
    } else {
      log.error('UNHANDLED ERROR');
      log.error(error);
      process.exit(1);
    }
  }
}
