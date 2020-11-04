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

import Path from 'path';
import Fs from 'fs';
import { promisify } from 'util';

const existsAsync = promisify(Fs.exists);

export async function findKibanaJson(directory: string): Promise<string | undefined> {
  if (await existsAsync(Path.resolve(directory, 'kibana.json'))) {
    return directory;
  }

  const parent = Path.dirname(directory);
  if (parent === directory) {
    return undefined;
  }

  return findKibanaJson(parent);
}
