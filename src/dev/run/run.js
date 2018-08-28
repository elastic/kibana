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

import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { isFailError } from './fail';
import { getFlags, getHelp } from './flags';

export async function run(body) {
  const flags = getFlags(process.argv.slice(2));

  if (flags.help) {
    process.stderr.write(getHelp());
    process.exit(1);
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags),
    writeTo: process.stdout
  });

  try {
    await body({ log, flags });
  } catch (error) {
    if (isFailError(error)) {
      log.error(error.message);
      process.exit(error.exitCode);
    } else {
      log.error('UNHANDLED ERROR');
      log.error(error);
      process.exit(1);
    }
  }
}
