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

import { FieldDescriptor } from 'src/legacy/server/index_patterns/service/index_patterns_service';
import { IndexPatternsService } from 'src/legacy/server/index_patterns';

export interface SavedObjectsIndexPatternField {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface SavedObjectsIndexPattern {
  fields: SavedObjectsIndexPatternField[];
  title: string;
}

export class SavedObjectsCacheIndexPatterns {
  private _indexPatterns: SavedObjectsIndexPattern | undefined = undefined;
  private _indexPatternsService: IndexPatternsService | undefined = undefined;

  public setIndexPatternsService(indexPatternsService: IndexPatternsService) {
    this._indexPatternsService = indexPatternsService;
  }

  public getIndexPatternsService() {
    return this._indexPatternsService;
  }

  public getIndexPatterns(): SavedObjectsIndexPattern | undefined {
    return this._indexPatterns;
  }

  public async setIndexPatterns(index: string) {
    await this._getIndexPattern(index);
  }

  private async _getIndexPattern(index: string) {
    try {
      if (this._indexPatternsService == null) {
        throw new TypeError('indexPatternsService is not defined');
      }
      const fieldsDescriptor: FieldDescriptor[] = await this._indexPatternsService.getFieldsForWildcard(
        {
          pattern: index,
        }
      );

      this._indexPatterns =
        fieldsDescriptor && Array.isArray(fieldsDescriptor) && fieldsDescriptor.length > 0
          ? {
              fields: fieldsDescriptor.map(field => ({
                aggregatable: field.aggregatable,
                name: field.name,
                searchable: field.searchable,
                type: field.type,
              })),
              title: index,
            }
          : undefined;
    } catch (err) {
      throw new Error(`Index Pattern Error - ${err.message}`);
    }
  }
}
