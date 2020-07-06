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

import { wrapAuthConfig } from './wrap_auth_config';

describe('Status wrapAuthConfig', () => {
  let options;

  beforeEach(() => {
    options = {
      method: 'GET',
      path: '/status',
      handler: function (request, h) {
        return h.response();
      },
    };
  });

  it('should return a function', () => {
    expect(typeof wrapAuthConfig()).toBe('function');
    expect(typeof wrapAuthConfig(true)).toBe('function');
    expect(typeof wrapAuthConfig(false)).toBe('function');
  });

  it('should not add auth config by default', () => {
    const wrapAuth = wrapAuthConfig();
    const wrapped = wrapAuth(options);
    expect(wrapped).not.toHaveProperty('config');
  });

  it('should not add auth config if allowAnonymous is false', () => {
    const wrapAuth = wrapAuthConfig(false);
    const wrapped = wrapAuth(options);
    expect(wrapped).not.toHaveProperty('config');
  });

  it('should add auth config if allowAnonymous is true', () => {
    const wrapAuth = wrapAuthConfig(true);
    const wrapped = wrapAuth(options);
    expect(wrapped).toHaveProperty('config');
    expect(wrapped.config).toHaveProperty('auth');
    expect(wrapped.config.auth).toBe(false);
  });
});
