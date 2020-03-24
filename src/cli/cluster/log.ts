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

import Chalk from 'chalk';

export class Log {
  constructor(private readonly quiet: boolean, private readonly silent: boolean) {}

  good(label: string, ...args: any[]) {
    if (this.quiet || this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.black.bgGreen(` ${label.trim()} `), ...args);
  }

  warn(label: string, ...args: any[]) {
    if (this.quiet || this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.black.bgYellow(` ${label.trim()} `), ...args);
  }

  bad(label: string, ...args: any[]) {
    if (this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.white.bgRed(` ${label.trim()} `), ...args);
  }

  write(label: string, ...args: any[]) {
    // eslint-disable-next-line no-console
    console.log(` ${label.trim()} `, ...args);
  }
}
