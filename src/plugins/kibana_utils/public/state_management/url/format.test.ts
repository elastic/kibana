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

import { replaceUrlHashQuery } from './format';

describe('format', () => {
  describe('replaceUrlHashQuery', () => {
    it('should add hash query to url without hash', () => {
      const url = 'http://localhost:5601/oxf/app/kibana';
      expect(replaceUrlHashQuery(url, () => ({ test: 'test' }))).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#?test=test"`
      );
    });

    it('should replace hash query', () => {
      const url = 'http://localhost:5601/oxf/app/kibana#?test=test';
      expect(
        replaceUrlHashQuery(url, (query) => ({
          ...query,
          test1: 'test1',
        }))
      ).toMatchInlineSnapshot(`"http://localhost:5601/oxf/app/kibana#?test=test&test1=test1"`);
    });
  });
});
