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

import { createHash } from 'crypto';
import * as fs from 'fs';
import { zipObject } from 'lodash';
import * as stream from 'stream';
import * as util from 'util';

const pipeline = util.promisify(stream.pipeline);

export type Hash = string;

export interface Integrities {
  [filePath: string]: Hash;
}

export async function getIntegrityHashes(filepaths: string[]): Promise<Integrities> {
  const hashes = await Promise.all(filepaths.map(getIntegrityHash));
  return zipObject(filepaths, hashes);
}

export async function getIntegrityHash(filepath: string): Promise<Hash | null> {
  try {
    const output = createHash('md5');

    await pipeline(fs.createReadStream(filepath), output);
    const data = output.read();
    if (data instanceof Buffer) {
      return data.toString('hex');
    }
    return data;
  } catch (err) {
    return null;
  }
}
