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

import { Readable } from 'stream';
import {
  createConcatStream,
  createFilterStream,
  createMapStream,
  createPromiseFromStreams,
  createSplitStream,
} from '../../../../legacy/utils/streams';
import { SavedObject } from '../service';
import { createLimitStream } from './create_limit_stream';
import { ImportError } from './types';

interface CollectSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  filter?: (obj: SavedObject) => boolean;
  supportedTypes: string[];
}

export async function collectSavedObjects({
  readStream,
  objectLimit,
  filter,
  supportedTypes,
}: CollectSavedObjectsOptions) {
  const errors: ImportError[] = [];
  const collectedObjects: SavedObject[] = await createPromiseFromStreams([
    readStream,
    createSplitStream('\n'),
    createMapStream((str: string) => {
      if (str && str !== '') {
        return JSON.parse(str);
      }
    }),
    createFilterStream<SavedObject>(obj => !!obj),
    createLimitStream(objectLimit),
    createFilterStream<SavedObject>(obj => {
      if (supportedTypes.includes(obj.type)) {
        return true;
      }
      errors.push({
        id: obj.id,
        type: obj.type,
        title: obj.attributes.title,
        error: {
          type: 'unsupported_type',
        },
      });
      return false;
    }),
    createFilterStream<SavedObject>(obj => (filter ? filter(obj) : true)),
    createMapStream((obj: SavedObject) => {
      // Ensure migrations execute on every saved object
      return Object.assign({ migrationVersion: {} }, obj);
    }),
    createConcatStream([]),
  ]);
  return {
    errors,
    collectedObjects,
  };
}
