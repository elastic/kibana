/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import uuid from 'uuid';
import { join } from 'path';
import { PathConfigType } from '@kbn/utils';
import { readFile, writeFile } from './fs';
import { HttpConfigType } from '../http';
import { Logger } from '../logging';

const FILE_ENCODING = 'utf8';
const FILE_NAME = 'uuid';
/**
 * This UUID was inadvertantly shipped in the 7.6.0 distributable and should be deleted if found.
 * See https://github.com/elastic/kibana/issues/57673 for more info.
 */
export const UUID_7_6_0_BUG = `ce42b997-a913-4d58-be46-bb1937feedd6`;

export async function resolveInstanceUuid({
  pathConfig,
  serverConfig,
  logger,
}: {
  pathConfig: PathConfigType;
  serverConfig: HttpConfigType;
  logger: Logger;
}): Promise<string> {
  const uuidFilePath = join(pathConfig.data, FILE_NAME);
  const uuidFromFile = await readUuidFromFile(uuidFilePath, logger);
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

async function readUuidFromFile(filepath: string, logger: Logger): Promise<string | undefined> {
  try {
    const content = await readFile(filepath);
    const decoded = content.toString(FILE_ENCODING);

    if (decoded === UUID_7_6_0_BUG) {
      logger.debug(`UUID from 7.6.0 bug detected, ignoring file UUID`);
      return undefined;
    } else {
      return decoded;
    }
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
