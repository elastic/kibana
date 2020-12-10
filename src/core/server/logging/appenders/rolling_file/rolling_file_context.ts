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

import { statSync } from 'fs';

/**
 * Context shared between the rolling file manager, policy and strategy.
 */
export class RollingFileContext {
  constructor(public readonly filePath: string) {}
  /**
   * The size of the currently opened file.
   */
  public currentFileSize: number = 0;
  /**
   * The time the currently opened file was created.
   */
  public currentFileTime: number = 0;

  public refreshFileInfo() {
    try {
      const { birthtime, size } = statSync(this.filePath);
      this.currentFileTime = birthtime.getTime();
      this.currentFileSize = size;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.error('[RollingFileAppender] error accessing the log file', e);
      }
      this.currentFileTime = Date.now();
      this.currentFileSize = 0;
    }
  }
}
