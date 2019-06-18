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

import { Field } from 'ui/index_patterns/_field';

/**
 * WARNING: these types are incomplete
 */

export interface IndexPattern {
  id: string;
  fields: Field[];
  title: string;
  timeFieldName?: string;
}
// 'enhanced' IndexPattern returned by IndexPatternProvider
// reason for having this seperate interface are several tests
// that currently depend on an interface without methods to succeed
export interface IndexPatternEnhanced extends IndexPattern {
  isTimeNanosBased: () => boolean;
}

export interface IndexPatternGetProvider {
  get: (id: string) => IndexPatternEnhanced;
}

export interface StaticIndexPatternField {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface StaticIndexPattern {
  fields: StaticIndexPatternField[];
  title: string;
}
