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

import { getSavedObjectIcon } from '../get_saved_object_icon';

describe('getSavedObjectIcon', () => {
  it('should handle saved searches', () => {
    expect(getSavedObjectIcon('search')).toEqual('search');
    expect(getSavedObjectIcon('searches')).toEqual('search');
  });

  it('should handle visualizations', () => {
    expect(getSavedObjectIcon('visualization')).toEqual('visualizeApp');
    expect(getSavedObjectIcon('visualizations')).toEqual('visualizeApp');
  });

  it('should handle index patterns', () => {
    expect(getSavedObjectIcon('index-pattern')).toEqual('indexPatternApp');
    expect(getSavedObjectIcon('index-patterns')).toEqual('indexPatternApp');
    expect(getSavedObjectIcon('indexPatterns')).toEqual('indexPatternApp');
  });

  it('should handle dashboards', () => {
    expect(getSavedObjectIcon('dashboard')).toEqual('dashboardApp');
    expect(getSavedObjectIcon('dashboards')).toEqual('dashboardApp');
  });

  it('should have a default case', () => {
    expect(getSavedObjectIcon('foo')).toEqual('apps');
  });
});
