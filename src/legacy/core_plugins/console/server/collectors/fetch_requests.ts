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

import { SavedObjectsClientContract } from 'src/core/server';

type ConsoleRequestTelemetry = Record<string, number>;

import {
  CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_TYPE,
  CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_ID,
} from '.';

export const fetchRequests = async (
  savedObjects: SavedObjectsClientContract
): Promise<ConsoleRequestTelemetry> => {
  try {
    const SO = await savedObjects.get<Record<string, number>>(
      CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_TYPE,
      CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_ID
    );
    return SO.attributes;
  } catch (e) {
    if (e?.output.statusCode === 404) {
      const attributes = {};
      await savedObjects.create<Record<string, number>>(
        CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_TYPE,
        attributes,
        { id: CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_ID }
      );
      return attributes;
    }
    throw e;
  }
};
