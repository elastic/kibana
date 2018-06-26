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

import path from 'path';
import JSON5 from 'json5';

import { arraysDiff, readFileAsync, pathExists, writeFileAsync } from './utils';

export async function checkUpdates(pluginPath, log) {
  const defaultMessagesBuffer = await readFileAsync(
    path.resolve(pluginPath, 'translations', 'defaultMessages.json')
  );
  let messagesCacheBuffer;

  try {
    const resolvedPath = path.resolve(
      pluginPath,
      'translations',
      'messagesCache.json'
    );
    await pathExists(resolvedPath);
    messagesCacheBuffer = await readFileAsync(resolvedPath);
  } catch (_) {
    messagesCacheBuffer = new Buffer('[]');
  }

  const defaultMessagesIds = Object.keys(
    JSON5.parse(defaultMessagesBuffer.toString())
  );
  const cachedMessagesIds = JSON5.parse(messagesCacheBuffer.toString());

  const [addedMessages, removedMessages] = arraysDiff(
    defaultMessagesIds,
    cachedMessagesIds
  );

  if (addedMessages.length > 0) {
    log.success(
      `New messages ids in ${pluginPath}:\n${addedMessages.join(', ')}`
    );
  }

  if (removedMessages.length > 0) {
    log.success(
      `Removed messages ids in ${pluginPath}:\n${removedMessages.join(', ')}`
    );
  }

  await writeFileAsync(
    path.resolve(pluginPath, 'translations', 'messagesCache.json'),
    JSON5.stringify(defaultMessagesIds, null, 2)
  );
}
