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
import Fs from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import { take } from 'rxjs/operators';
import { IConfigService } from '../config';
import { PathConfigType, config as pathConfigDef } from '../path';
import { HttpConfigType, config as httpConfigDef } from '../http';
import { Logger } from '../logging';

const readFile = promisify(Fs.readFile);
const writeFile = promisify(Fs.writeFile);

const FILE_ENCODING = 'utf8';
const FILE_NAME = 'uuid';

export async function resolveInstanceUuid(
  configService: IConfigService,
  logger: Logger
): Promise<string> {
  const [pathConfig, serverConfig] = await Promise.all([
    configService
      .atPath<PathConfigType>(pathConfigDef.path)
      .pipe(take(1))
      .toPromise(),
    configService
      .atPath<HttpConfigType>(httpConfigDef.path)
      .pipe(take(1))
      .toPromise(),
  ]);

  const uuidFilePath = join(pathConfig.data, FILE_NAME);

  const uuidFromFile = await readUuidFromFile(uuidFilePath);
  const uuidFromConfig = serverConfig.uuid;

  if (uuidFromConfig) {
    if (uuidFromConfig === uuidFromFile) {
      // uuid matches, nothing to do
      logger.debug(`Kibana instance UUID: ${uuidFromConfig}`);
      return uuidFromConfig;
    } else {
      // uuid in file don't match, or file was not present, we need to write it.
      if (uuidFromFile === undefined) {
        logger.debug(`Setting new Kibana instance UUID: ${uuidFromConfig}`);
      } else {
        logger.debug(`Updating Kibana instance UUID to: ${uuidFromConfig} (was: ${uuidFromFile})`);
      }
      await writeUuidToFile(uuidFilePath, uuidFromConfig);
      return uuidFromConfig;
    }
  }
  if (uuidFromFile === undefined) {
    const newUuid = uuid.v4();
    // no uuid either in config or file, we need to generate and write it.
    logger.debug(`Setting new Kibana instance UUID: ${newUuid}`);
    await writeUuidToFile(uuidFilePath, newUuid);
    return newUuid;
  }

  logger.debug(`Resuming persistent Kibana instance UUID: ${uuidFromFile}`);
  return uuidFromFile;
}

async function readUuidFromFile(filepath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filepath);
    return content.toString(FILE_ENCODING);
  } catch (e) {
    if (e.code === 'ENOENT') {
      // non-existent uuid file is ok, we will create it.
      return undefined;
    }
    throw new Error(
      'Unable to read Kibana UUID file, please check the uuid.server configuration ' +
        'value in kibana.yml and ensure Kibana has sufficient permissions to read / write to this file. ' +
        `Error was: ${e.code}`
    );
  }
}

async function writeUuidToFile(filepath: string, uuidValue: string) {
  try {
    return await writeFile(filepath, uuidValue, { encoding: FILE_ENCODING });
  } catch (e) {
    throw new Error(
      'Unable to write Kibana UUID file, please check the uuid.server configuration ' +
        'value in kibana.yml and ensure Kibana has sufficient permissions to read / write to this file. ' +
        `Error was: ${e.code}`
    );
  }
}
