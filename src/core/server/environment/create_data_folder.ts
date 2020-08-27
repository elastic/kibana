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

import { mkdir } from './fs';
import { Logger } from '../logging';
import { PathConfigType } from '../path';

export async function createDataFolder({
  pathConfig,
  logger,
}: {
  pathConfig: PathConfigType;
  logger: Logger;
}): Promise<void> {
  const dataFolder = pathConfig.data;
  try {
    // Create the data directory (recursively, if the a parent dir doesn't exist).
    // If it already exists, does nothing.
    await mkdir(dataFolder, { recursive: true });
  } catch (e) {
    logger.error(`Error trying to create data folder at ${dataFolder}: ${e}`);
    throw e;
  }
}
