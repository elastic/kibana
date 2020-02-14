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

import expect from '@kbn/expect';
import {
  addSystemApiHeader,
  isSystemApiRequest,
} from '../../../../../plugins/kibana_legacy/public';

describe('system_api', () => {
  describe('#addSystemApiHeader', () => {
    it('adds the correct system API header', () => {
      const headers = {
        'kbn-version': '4.6.0',
      };
      const newHeaders = addSystemApiHeader(headers);

      expect(newHeaders).to.have.property('kbn-system-request');
      expect(newHeaders['kbn-system-request']).to.be(true);

      expect(newHeaders).to.have.property('kbn-version');
      expect(newHeaders['kbn-version']).to.be('4.6.0');
    });
  });

  describe('#isSystemApiRequest', () => {
    it('returns true for a system HTTP request', () => {
      const mockRequest = {
        headers: {
          'kbn-system-request': true,
        },
      };
      expect(isSystemApiRequest(mockRequest)).to.be(true);
    });

    it('returns true for a legacy system API HTTP request', () => {
      const mockRequest = {
        headers: {
          'kbn-system-api': true,
        },
      };
      expect(isSystemApiRequest(mockRequest)).to.be(true);
    });

    it('returns false for a non-system API HTTP request', () => {
      const mockRequest = {
        headers: {},
      };
      expect(isSystemApiRequest(mockRequest)).to.be(false);
    });
  });
});
