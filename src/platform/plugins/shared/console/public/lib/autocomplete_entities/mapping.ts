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
import type { HttpSetup } from '@kbn/core-http-browser';
import { type Settings } from '../../services';
import { API_BASE_PATH } from '../../../common/constants';
import type { ResultTerm, AutoCompleteContext } from '../autocomplete/types';
import { expandAliases } from './expand_aliases';
import type { Field } from './types';
import { type AutoCompleteEntitiesApiResponse } from './types';
import { isRecord } from '../../../common/utils/record_utils';

// NOTE: This reflects the pre-migration `FieldMapping` shape that callers historically assumed.
// Values are still treated as unvalidated payloads and must be guarded at runtime.
//
// interface FieldMapping {
//   enabled?: boolean;
//   path?: string;
//   properties?: Record<string, FieldMapping>;
//   type?: string;
//   index_name?: string;
//   fields?: Record<string, FieldMapping>;
// }
//
type FieldMappingLike = Record<string, unknown> & {
  enabled?: unknown;
  path?: unknown;
  properties?: unknown;
  type?: unknown;
  index_name?: unknown;
  fields?: unknown;
};

function getFieldNamesFromProperties(properties: Record<string, unknown> = {}): Field[] {
  const fieldList = Object.entries(properties).flatMap(([fieldName, fieldMapping]) => {
    return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
  });

  // deduping
  return _.uniqBy(fieldList, function (f) {
    return f.name + ':' + f.type;
  });
}

function getFieldNamesFromFieldMapping(fieldName: string, fieldMapping: unknown): Field[] {
  if (!isRecord(fieldMapping)) {
    return [];
  }

  const mapping = fieldMapping as FieldMappingLike;

  if (mapping.enabled === false) {
    return [];
  }
  let nestedFields: Field[];

  const pathType = typeof mapping.path === 'string' ? mapping.path : 'full';

  function applyPathSettings(nestedFieldNames: Field[]): Field[] {
    if (pathType === 'full') {
      return nestedFieldNames.map((f) => {
        f.name = fieldName + '.' + f.name;
        return f;
      });
    }
    return nestedFieldNames;
  }

  if (isRecord(mapping.properties)) {
    // derived object type
    nestedFields = getFieldNamesFromProperties(mapping.properties);
    return applyPathSettings(nestedFields);
  }

  const fieldType = typeof mapping.type === 'string' ? mapping.type : undefined;

  const ret = { name: fieldName, type: fieldType };

  if (typeof mapping.index_name === 'string') {
    ret.name = mapping.index_name;
  }

  if (isRecord(mapping.fields)) {
    nestedFields = Object.entries(mapping.fields).flatMap(([name, childMapping]) =>
      getFieldNamesFromFieldMapping(name, childMapping)
    );
    nestedFields = applyPathSettings(nestedFields);
    return [ret, ...nestedFields];
  }

  return [ret];
}

export interface BaseMapping {
  perIndexTypes: Partial<Record<string, Record<string, Field[]>>>;
  /**
   * Fetches mappings definition
   */
  fetchMappings(index: string): Promise<IndicesGetMappingResponse>;

  /**
   * Retrieves mappings definition from cache, fetches if necessary.
   */
  getMappings(
    indices?: string | string[],
    types?: string | string[],
    autoCompleteContext?: AutoCompleteContext
  ): Field[];

  /**
   * Stores mappings definition
   * @param mappings
   */
  loadMappings(mappings: Record<string, { mappings?: unknown; properties?: unknown }>): void;
  clearMappings(): void;
}

export class Mapping implements BaseMapping {
  private http: HttpSetup | undefined;

  private settings: Settings | undefined;

  /**
   * Map of the mappings of actual ES indices.
   */
  public perIndexTypes: Partial<Record<string, Record<string, Field[]>>> = {};

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
   * @internal
   */
  private loadingState: Record<string, boolean> = {};

  public setup(http: HttpSetup, settings: Settings) {
    this.http = http;
    this.settings = settings;
  }

  private getRequiredHttp(): HttpSetup {
    if (!this.http) {
      throw new Error('Mapping.setup() must be called before using Mapping');
    }
    return this.http;
  }

  private getRequiredSettings(): Settings {
    if (!this.settings) {
      throw new Error('Mapping.setup() must be called before using Mapping');
    }
    return this.settings;
  }

  /**
   * Fetches mappings of the requested indices.
   * @param index
   */
  async fetchMappings(index: string): Promise<IndicesGetMappingResponse> {
    const response = await this.getRequiredHttp().get<AutoCompleteEntitiesApiResponse>(
      `${API_BASE_PATH}/autocomplete_entities`,
      {
        query: { fields: true, fieldsIndices: index },
      }
    );

    return response.mappings;
  }

  getMappings = (
    indices?: string | string[],
    types?: string | string[],
    autoCompleteContext?: AutoCompleteContext
  ) => {
    // get fields for indices and types. Both can be a list, a string or null (meaning all).
    let ret: Field[] = [];

    if (!this.getRequiredSettings().getAutocomplete().fields) return ret;

    indices = expandAliases(indices);

    if (typeof indices === 'string') {
      const index = indices;
      const typeDict = this.perIndexTypes[index];

      if (!typeDict || Object.keys(typeDict).length === 0) {
        if (!autoCompleteContext) return ret;

        // Mappings fetching for the index is already in progress
        if (this.loadingState[index]) return ret;

        this.loadingState[index] = true;

        const asyncResultsState =
          autoCompleteContext.asyncResultsState ??
          (autoCompleteContext.asyncResultsState = {
            isLoading: false,
            lastFetched: null,
            results: Promise.resolve([]),
          });

        asyncResultsState.isLoading = true;

        asyncResultsState.results = new Promise<ResultTerm[]>((resolve) => {
          this._isLoading$.next(true);

          this.fetchMappings(index)
            .then((mapping) => {
              this._isLoading$.next(false);

              asyncResultsState.isLoading = false;
              asyncResultsState.lastFetched = Date.now();

              const mappingsIndices = Object.keys(mapping);
              if (
                mappingsIndices.length > 1 ||
                (mappingsIndices[0] && mappingsIndices[0] !== index)
              ) {
                this.perWildcardIndices[index] = Object.keys(mapping);
              }

              // cache mappings
              this.loadMappings(mapping);

              const mappings = this.getMappings(indices, types, autoCompleteContext);
              delete this.loadingState[index];
              resolve(mappings);
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error(error);
              this._isLoading$.next(false);
              delete this.loadingState[index];
            });
        });

        return [];
      }

      if (typeof types === 'string') {
        ret = typeDict[types] ?? ret;
      } else {
        // filter what we need
        Object.entries(typeDict).forEach(([type, fields]) => {
          if (!types || types.length === 0 || types.includes(type)) {
            ret.push(...fields);
          }
        });
      }
    } else {
      // multi index mode.
      Object.keys(this.perIndexTypes).forEach((index) => {
        if (!indices || indices.length === 0 || indices.includes(index)) {
          ret.push(...this.getMappings(index, types, autoCompleteContext));
        }
      });
    }

    return _.uniqBy(ret, function (f) {
      return f.name + ':' + f.type;
    });
  };

  loadMappings = (mappings: Record<string, { mappings?: unknown; properties?: unknown }>) => {
    Object.entries(mappings).forEach(([index, indexMapping]) => {
      const normalizedIndexMappings: Record<string, Field[]> = {};

      // Migrate 1.0.0 mappings. This format has changed, so we need to extract the underlying mapping.
      const mappingRoot = isRecord(indexMapping) ? indexMapping : {};
      const transformedMapping =
        isRecord(mappingRoot.mappings) && Object.keys(mappingRoot).length === 1
          ? mappingRoot.mappings
          : mappingRoot;

      if (!isRecord(transformedMapping)) {
        this.perIndexTypes[index] = {};
        return;
      }

      Object.entries(transformedMapping).forEach(([typeName, typeMapping]) => {
        if (typeName === 'properties' && isRecord(typeMapping)) {
          normalizedIndexMappings[typeName] = getFieldNamesFromProperties(typeMapping);
          return;
        }

        normalizedIndexMappings[typeName] = [];
      });
      this.perIndexTypes[index] = normalizedIndexMappings;
    });
  };

  clearMappings = () => {
    this.perIndexTypes = {};
  };
}
