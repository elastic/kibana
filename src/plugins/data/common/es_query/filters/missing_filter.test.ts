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

import { getMissingFilterField } from './missing_filter';

describe('missing filter', function () {
  describe('getMissingFilterField', function () {
    it('should return the name of the field an missing query is targeting', () => {
      const filter = {
        missing: {
          field: 'extension',
        },
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
      };
      const result = getMissingFilterField(filter);
      expect(result).toBe('extension');
    });
  });
});
