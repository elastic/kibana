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
import { IndexPattern } from '../../../../data/common';

/**
 * Function to provide fallback when
 * 1) no columns are given
 * 2) Just one column is given, which is the configured timefields
 */
export function getDisplayedColumns(stateColumns: string[] = [], indexPattern: IndexPattern) {
  return stateColumns &&
    stateColumns.length > 0 &&
    // check if all columns where removed except the configured timeField (this can't be removed)
    !(stateColumns.length === 1 && stateColumns[0] === indexPattern.timeFieldName)
    ? stateColumns
    : ['_source'];
}
