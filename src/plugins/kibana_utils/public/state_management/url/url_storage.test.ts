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

import { createBrowserHistory, createHashHistory } from 'history';
import { getRelativeToHistoryPath } from './url_storage';

describe('url_storage', () => {
  describe('getRelativeToHistoryPath', () => {
    it('should extract path relative to browser history without basename', () => {
      const history = createBrowserHistory();
      const url =
        "http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual(
        "/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });

    it('should extract path relative to browser history with basename', () => {
      const url =
        "http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const history1 = createBrowserHistory({ basename: '/oxf/app/' });
      const relativePath1 = getRelativeToHistoryPath(url, history1);
      expect(relativePath1).toEqual(
        "/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );

      const history2 = createBrowserHistory({ basename: '/oxf/app/kibana/' });
      const relativePath2 = getRelativeToHistoryPath(url, history2);
      expect(relativePath2).toEqual(
        "#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });

    it('should extract path relative to browser history with basename from relative url', () => {
      const history = createBrowserHistory({ basename: '/oxf/app/' });
      const url =
        "/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual(
        "/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });

    it('should extract path relative to hash history without basename', () => {
      const history = createHashHistory();
      const url =
        "http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual(
        "/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });

    it('should extract path relative to hash history with basename', () => {
      const history = createHashHistory({ basename: 'management' });
      const url =
        "http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual(
        "/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });

    it('should extract path relative to hash history with basename from relative url', () => {
      const history = createHashHistory({ basename: 'management' });
      const url =
        "/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual(
        "/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });
  });
});
