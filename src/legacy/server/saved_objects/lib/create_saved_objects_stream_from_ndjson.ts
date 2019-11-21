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
import { SavedObject, SavedObjectsExportResultDetails } from 'src/core/server';
import { createSplitStream, createMapStream, createFilterStream } from '../../../utils/streams';

export function createSavedObjectsStreamFromNdJson(ndJsonStream: Readable) {
  return ndJsonStream
    .pipe(createSplitStream('\n'))
    .pipe(
      createMapStream((str: string) => {
        if (str && str.trim() !== '') {
          return JSON.parse(str);
        }
      })
    )
    .pipe(
      createFilterStream<SavedObject | SavedObjectsExportResultDetails>(
        obj => !!obj && !(obj as SavedObjectsExportResultDetails).exportedCount
      )
    );
}
