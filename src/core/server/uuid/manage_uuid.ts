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

import uuid from 'uuid';
import { promisify } from 'util';
import * as fs from 'fs';
import { join } from 'path';
import { take } from 'rxjs/operators';
import { IConfigService } from '../config';
import { PathConfigType } from '../path';
import { HttpConfigType } from '../http';

const FILE_ENCODING = 'utf8';
const FILE_NAME = 'uuid';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export async function manageInstanceUuid(configService: IConfigService): Promise<string> {
  const [pathConfig, serverConfig] = await Promise.all([
    configService
      .atPath<PathConfigType>('path')
      .pipe(take(1))
      .toPromise(),
    configService
      .atPath<HttpConfigType>('server')
      .pipe(take(1))
      .toPromise(),
  ]);

  const uuidFilePath = join(pathConfig.data, FILE_NAME);

  const uuidFromFile = await readUUIDFromFile(uuidFilePath);
  const uuidFromConfig = serverConfig.uuid;

  if (uuidFromConfig) {
    if (uuidFromConfig === uuidFromFile) {
      // uuid matches, nothing to do
      return uuidFromConfig;
    } else {
      // uuid in file don't match, or file was not present, we need to write it.
      await writeUUIDToFile(uuidFilePath, uuidFromConfig);
      return uuidFromConfig;
    }
  }
  if (uuidFromFile === undefined) {
    // no uuid either in config or file, we need to generate and write it.
    const newUUID = uuid.v4();
    await writeUUIDToFile(uuidFilePath, newUUID);
    return newUUID;
  }
  return uuidFromFile;
}

async function readUUIDFromFile(filepath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filepath);
    return content.toString(FILE_ENCODING);
  } catch (e) {
    if (e.code === 'ENOENT') {
      // non-existent uuid file is ok, we will create it.
      return undefined;
    }
    throw e;
  }
}

async function writeUUIDToFile(filepath: string, uuidValue: string) {
  return await writeFile(filepath, uuidValue, { encoding: FILE_ENCODING });
}
