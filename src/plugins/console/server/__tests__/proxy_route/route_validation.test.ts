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

import { routeValidationConfig } from '../../routes/api/console/proxy/validation_config';

const { query } = routeValidationConfig;

describe('Proxy route validation', () => {
  describe('query', () => {
    describe('allows', () => {
      it('known http verb method and path value', () => {
        expect(query.validate({ method: 'GET', path: 'test' }));
      });
      it('mixed case http verbs', () => {
        expect(query.validate({ method: 'hEaD', path: 'test' }));
      });
    });
    describe('throws for', () => {
      it('empty query method value', () => {
        expect(() => {
          query.validate({ method: '', path: 'test' });
        }).toThrow('Method must be one of');
      });
      it('unknown method value', () => {
        expect(() => {
          query.validate({ method: 'abc', path: 'test' });
        }).toThrow('Method must be one of');
      });
      it('empty path value', () => {
        expect(() => {
          query.validate({ method: 'GET', path: '' });
        }).toThrow('Expected non-empty string');
      });
    });
  });
});
