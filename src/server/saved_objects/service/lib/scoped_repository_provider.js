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

import { SavedObjectsRepository } from './repository';

/**
 * Provider for the Saved Object Repository.
 */
export class ScopedSavedObjectsRepositoryProvider {

  constructor({
    index,
    mappings,
    onBeforeWrite
  }) {
    this._index = index;
    this._mappings = mappings;
    this._onBeforeWrite = onBeforeWrite;
  }

  setScopedDocumentFormatFactory(customFactory) {
    if (this._customDocumentFormatFactory) {
      throw new TypeError('Custom document format factory has already been set.');
    }

    this._customDocumentFormatFactory = customFactory;
  }

  getRepository(callCluster, request) {

    if (typeof callCluster !== 'function') {
      throw new TypeError('Repository requires a "callCluster" function to be provided.');
    }

    const documentFormat = this._customDocumentFormatFactory ? this._customDocumentFormatFactory(request) : null;

    return new SavedObjectsRepository({
      index: this._index,
      mappings: this._mappings,
      onBeforeWrite: this._onBeforeWrite,
      callCluster,
      documentFormat,
    });
  }
}
