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

import { IFieldType } from './fields';

export interface IIndexPattern {
  // TODO: IIndexPattern shouldn't include attributes.
  // We need a dedicated type for index patterns inside a saved object
  // as described in https://github.com/elastic/kibana/issues/54894
  attributes: any;
  fields: IFieldType[];
  title: string;
  id?: string;
  type?: string;
  timeFieldName?: string;
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
