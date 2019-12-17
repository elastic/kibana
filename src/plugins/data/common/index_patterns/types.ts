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

import { IFieldList, Field, IFieldType } from '../../public';

export interface IIndexPattern {
  fields: IFieldList;
  title: string;
  id?: string;
  type?: string;
  flattenHit: any;
  formatField: any;
  formatHit: any;
  timeFieldName?: string;
  typeMeta: any;
  metaFields: string[];
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: unknown;
    }
  >;
  routes: {
    edit: string;
    addField: string;
    indexedFields: string;
    scriptedFields: string;
    sourceFilters: string;
  };
  addScriptedField: (
    name: string,
    script: string,
    fieldType: string | undefined,
    lang: string
  ) => Promise<void | Error>;
  removeScriptedField: (field: IFieldType) => Promise<void | Error>;
  create: (allowOverride?: boolean) => Promise<string | false>;
  destroy: () => Promise<{}> | undefined;
  getComputedFields: () => {
    storedFields: string[];
    scriptFields: any;
    docvalueFields: Array<{
      field: any;
      format: string;
    }>;
  };
  getFieldByName: (name: string) => void | Field;
  getNonScriptedFields: () => IFieldList;
  getScriptedFields: () => IFieldList;
  getSourceFiltering: () => {
    excludes: any[];
  };
  getTimeField: () => Field | undefined;
  init: (forceFieldRefresh?: boolean) => Promise<this>;
  isTimeBased: () => boolean;
  isTimeBasedWildcard: () => boolean;
  isTimeNanosBased: () => boolean;
  isWildcard: () => boolean;
  popularizeField: (fieldName: string, unit?: number) => Promise<void | Error>;
  prepBody: () => {
    [key: string]: any;
  };
  refreshFields: () => Promise<void | Error | never[]>;
  save: (saveAttempts?: number) => Promise<void | Error>;
  toJSON: () => string | undefined;
  toString: () => string;
}
