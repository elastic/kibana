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

import { canViewInApp } from '../in_app_url';

describe('canViewInApp', () => {
  it('should handle saved searches', () => {
    let uiCapabilities = {
      discover: {
        show: true,
      },
    };
    expect(canViewInApp(uiCapabilities, 'search')).toEqual(true);
    expect(canViewInApp(uiCapabilities, 'searches')).toEqual(true);

    uiCapabilities = {
      discover: {
        show: false,
      },
    };
    expect(canViewInApp(uiCapabilities, 'search')).toEqual(false);
    expect(canViewInApp(uiCapabilities, 'searches')).toEqual(false);
  });

  it('should handle visualizations', () => {
    let uiCapabilities = {
      visualize: {
        show: true,
      },
    };
    expect(canViewInApp(uiCapabilities, 'visualization')).toEqual(true);
    expect(canViewInApp(uiCapabilities, 'visualizations')).toEqual(true);

    uiCapabilities = {
      visualize: {
        show: false,
      },
    };
    expect(canViewInApp(uiCapabilities, 'visualization')).toEqual(false);
    expect(canViewInApp(uiCapabilities, 'visualizations')).toEqual(false);
  });

  it('should handle index patterns', () => {
    let uiCapabilities = {
      management: {
        kibana: {
          index_patterns: true,
        },
      },
    };
    expect(canViewInApp(uiCapabilities, 'index-pattern')).toEqual(true);
    expect(canViewInApp(uiCapabilities, 'index-patterns')).toEqual(true);
    expect(canViewInApp(uiCapabilities, 'indexPatterns')).toEqual(true);

    uiCapabilities = {
      management: {
        kibana: {
          index_patterns: false,
        },
      },
    };
    expect(canViewInApp(uiCapabilities, 'index-pattern')).toEqual(false);
    expect(canViewInApp(uiCapabilities, 'index-patterns')).toEqual(false);
    expect(canViewInApp(uiCapabilities, 'indexPatterns')).toEqual(false);
  });

  it('should handle dashboards', () => {
    let uiCapabilities = {
      dashboard: {
        show: true,
      },
    };
    expect(canViewInApp(uiCapabilities, 'dashboard')).toEqual(true);
    expect(canViewInApp(uiCapabilities, 'dashboards')).toEqual(true);

    uiCapabilities = {
      dashboard: {
        show: false,
      },
    };
    expect(canViewInApp(uiCapabilities, 'dashboard')).toEqual(false);
    expect(canViewInApp(uiCapabilities, 'dashboards')).toEqual(false);
  });

  it('should have a default case', () => {
    let uiCapabilities = {
      foo: {
        show: true,
      },
    };
    expect(canViewInApp(uiCapabilities, 'foo')).toEqual(true);

    uiCapabilities = {
      foo: {
        show: false,
      },
    };
    expect(canViewInApp(uiCapabilities, 'foo')).toEqual(false);
  });
});
