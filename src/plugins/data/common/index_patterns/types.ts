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

import { ToastInputFields, ErrorToastOptions } from 'src/core/public/notifications';
// eslint-disable-next-line
import type { SavedObject } from 'src/core/server';
import { IFieldType } from './fields';

export interface IIndexPattern {
  [key: string]: any;
  fields: IFieldType[];
  title: string;
  id?: string;
  type?: string;
  timeFieldName?: string;
  getTimeField?(): IFieldType | undefined;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: unknown;
    }
  >;
}

/**
 * Use data plugin interface instead
 * @deprecated
 */
export interface IndexPatternAttributes {
  type: string;
  fields: string;
  title: string;
  typeMeta: string;
  timeFieldName?: string;
}

export type OnNotification = (toastInputFields: ToastInputFields) => void;
export type OnError = (error: Error, toastInputFields: ErrorToastOptions) => void;

// todo - why do remove and set return boolean? is it for error handling?
export interface UiSettingsCommon {
  get: (key: string) => Promise<any>;
  getAll: () => Promise<Record<string, any>>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export interface SavedObjectsClientCommonFindArgs {
  type: string | string[];
  fields?: string[];
  perPage?: number;
  search?: string;
  searchFields?: string[];
}

export interface SavedObjectsClientCommon {
  find: <T = unknown>(options: SavedObjectsClientCommonFindArgs) => Promise<Array<SavedObject<T>>>;
  get: (type: string, id: string) => Promise<SavedObject>;
  update: (
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
    //  ) => Promise<Pick<SavedObject, 'attributes' | 'references'>>;
  ) => Promise<SavedObject>;
  create: (
    type: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) => Promise<SavedObject>;
  delete: (type: string, id: string) => Promise<{}>;
}

export interface GetFieldsOptions {
  pattern?: string;
  type?: string;
  params?: any;
  lookBack?: boolean;
  metaFields?: string;
}

export interface IIndexPatternsApiClient {
  getFieldsForTimePattern: (options: GetFieldsOptions) => Promise<any>;
  getFieldsForWildcard: (options: GetFieldsOptions) => Promise<any>;
}

export { SavedObject };
