/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import { HttpSetup } from '@kbn/core-http-browser';
import { type Settings } from '../../services';
import { API_BASE_PATH } from '../../../common/constants';
import type { ResultTerm, AutoCompleteContext } from '../autocomplete/types';
import { expandAliases } from './expand_aliases';
import type { Field, FieldMapping } from './types';
import { type AutoCompleteEntitiesApiResponse } from './types';

function getFieldNamesFromProperties(properties: Record<string, FieldMapping> = {}) {
  const fieldList = Object.entries(properties).flatMap(([fieldName, fieldMapping]) => {
    return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
  });

  // deduping
  return _.uniqBy(fieldList, function (f) {
    return f.name + ':' + f.type;
  });
}

function getFieldNamesFromFieldMapping(
  fieldName: string,
  fieldMapping: FieldMapping
): Array<{ name: string; type: string | undefined }> {
  if (fieldMapping.enabled === false) {
    return [];
  }
  let nestedFields;

  function applyPathSettings(nestedFieldNames: Array<{ name: string; type: string | undefined }>) {
    const pathType = fieldMapping.path || 'full';
    if (pathType === 'full') {
      return nestedFieldNames.map((f) => {
        f.name = fieldName + '.' + f.name;
        return f;
      });
    }
    return nestedFieldNames;
  }

  if (fieldMapping.properties) {
    // derived object type
    nestedFields = getFieldNamesFromProperties(fieldMapping.properties);
    return applyPathSettings(nestedFields);
  }

  const fieldType = fieldMapping.type;

  const ret = { name: fieldName, type: fieldType };

  if (fieldMapping.index_name) {
    ret.name = fieldMapping.index_name;
  }

  if (fieldMapping.fields) {
    nestedFields = Object.entries(fieldMapping.fields).flatMap(([name, mapping]) => {
      return getFieldNamesFromFieldMapping(name, mapping);
    });
    nestedFields = applyPathSettings(nestedFields);
    nestedFields.unshift(ret);
    return nestedFields;
  }

  return [ret];
}

export interface BaseMapping {
  perIndexTypes: Record<string, object>;
  /**
   * Fetches mappings definition
   */
  fetchMappings(index: string): Promise<IndicesGetMappingResponse>;

  /**
   * Retrieves mappings definition from cache, fetches if necessary.
   */
  getMappings(
    indices: string | string[],
    types?: string | string[],
    autoCompleteContext?: AutoCompleteContext
  ): Field[];

  /**
   * Stores mappings definition
   * @param mappings
   */
  loadMappings(mappings: IndicesGetMappingResponse): void;
  clearMappings(): void;
}

export class Mapping implements BaseMapping {
  private http!: HttpSetup;

  private settings!: Settings;

  /**
   * Map of the mappings of actual ES indices.
   */
  public perIndexTypes: Record<string, object> = {};

  /**
   * Map of the user-input wildcards and actual indices.
   */
  public perWildcardIndices: Record<string, string[]> = {};

  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);

  /**
   * Indicates if mapping fetching is in progress.
   */
  public readonly isLoading$ = this._isLoading$.asObservable();

  /**
   * Map of the currently loading mappings for index patterns specified by a user.
   * @private
   */
  private loadingState: Record<string, boolean> = {};

  public setup(http: HttpSetup, settings: Settings) {
    this.http = http;
    this.settings = settings;
  }

  /**
   * Fetches mappings of the requested indices.
   * @param index
   */
  async fetchMappings(index: string): Promise<IndicesGetMappingResponse> {
    const response = await this.http.get<AutoCompleteEntitiesApiResponse>(
      `${API_BASE_PATH}/autocomplete_entities`,
      {
        query: { fields: true, fieldsIndices: index },
      }
    );

    return response.mappings;
  }

  getMappings = (
    indices: string | string[],
    types?: string | string[],
    autoCompleteContext?: AutoCompleteContext
  ) => {
    // get fields for indices and types. Both can be a list, a string or null (meaning all).
    let ret: Field[] = [];

    if (!this.settings.getAutocomplete().fields) return ret;

    indices = expandAliases(indices);

    if (typeof indices === 'string') {
      const typeDict = this.perIndexTypes[indices] as Record<string, unknown>;

      if (!typeDict || Object.keys(typeDict).length === 0) {
        if (!autoCompleteContext) return ret;

        // Mappings fetching for the index is already in progress
        if (this.loadingState[indices]) return ret;

        this.loadingState[indices] = true;

        if (!autoCompleteContext.asyncResultsState) {
          autoCompleteContext.asyncResultsState = {} as AutoCompleteContext['asyncResultsState'];
        }

        autoCompleteContext.asyncResultsState!.isLoading = true;

        autoCompleteContext.asyncResultsState!.results = new Promise<ResultTerm[]>(
          (resolve, reject) => {
            this._isLoading$.next(true);

            this.fetchMappings(indices as string)
              .then((mapping) => {
                this._isLoading$.next(false);

                autoCompleteContext.asyncResultsState!.isLoading = false;
                autoCompleteContext.asyncResultsState!.lastFetched = Date.now();

                const mappingsIndices = Object.keys(mapping);
                if (
                  mappingsIndices.length > 1 ||
                  (mappingsIndices[0] && mappingsIndices[0] !== indices)
                ) {
                  this.perWildcardIndices[indices as string] = Object.keys(mapping);
                }

                // cache mappings
                this.loadMappings(mapping);

                const mappings = this.getMappings(indices, types, autoCompleteContext);
                delete this.loadingState[indices as string];
                resolve(mappings);
              })
              .catch((error) => {
                // eslint-disable-next-line no-console
                console.error(error);
                this._isLoading$.next(false);
                delete this.loadingState[indices as string];
              });
          }
        );

        return [];
      }

      if (typeof types === 'string') {
        const f = typeDict[types];
        if (Array.isArray(f)) {
          ret = f;
        }
      } else {
        // filter what we need
        Object.entries(typeDict).forEach(([type, fields]) => {
          if (!types || types.length === 0 || types.includes(type)) {
            ret.push(fields as Field);
          }
        });

        ret = ([] as Field[]).concat.apply([], ret);
      }
    } else {
      // multi index mode.
      Object.keys(this.perIndexTypes).forEach((index) => {
        if (!indices || indices.length === 0 || indices.includes(index)) {
          ret.push(this.getMappings(index, types, autoCompleteContext) as unknown as Field);
        }
      });

      ret = ([] as Field[]).concat.apply([], ret);
    }

    return _.uniqBy(ret, function (f) {
      return f.name + ':' + f.type;
    });
  };

  loadMappings = (mappings: IndicesGetMappingResponse) => {
    Object.entries(mappings).forEach(([index, indexMapping]) => {
      const normalizedIndexMappings: Record<string, object[]> = {};
      let transformedMapping: Record<string, any> = indexMapping;

      // Migrate 1.0.0 mappings. This format has changed, so we need to extract the underlying mapping.
      if (indexMapping.mappings && Object.keys(indexMapping).length === 1) {
        transformedMapping = indexMapping.mappings;
      }

      Object.entries(transformedMapping).forEach(([typeName, typeMapping]) => {
        if (typeName === 'properties') {
          const fieldList = getFieldNamesFromProperties(typeMapping);
          normalizedIndexMappings[typeName] = fieldList;
        } else {
          normalizedIndexMappings[typeName] = [];
        }
      });
      this.perIndexTypes[index] = normalizedIndexMappings;
    });
  };

  clearMappings = () => {
    this.perIndexTypes = {};
  };
}
