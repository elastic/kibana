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

import { mockStorage } from '../../storage/hashed_item_store/mock';
import { HashedItemStore } from '../../storage/hashed_item_store';
import { hashUrl, unhashUrl } from './hash_unhash_url';

describe('hash unhash url', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockStorage.setStubbedSizeLimit(5000000);
  });

  describe('hash url', () => {
    describe('does nothing', () => {
      it('if url is empty', () => {
        const url = '';
        expect(hashUrl(url)).toBe(url);
      });

      it('if just a host and port', () => {
        const url = 'https://localhost:5601';
        expect(hashUrl(url)).toBe(url);
      });

      it('if just a path', () => {
        const url = 'https://localhost:5601/app/kibana';
        expect(hashUrl(url)).toBe(url);
      });

      it('if just a path and query', () => {
        const url = 'https://localhost:5601/app/kibana?foo=bar';
        expect(hashUrl(url)).toBe(url);
      });

      it('if empty hash with query', () => {
        const url = 'https://localhost:5601/app/kibana?foo=bar#';
        expect(hashUrl(url)).toBe(url);
      });

      it('if query parameter matches and there is no hash', () => {
        const url = 'https://localhost:5601/app/kibana?testParam=(yes:!t)';
        expect(hashUrl(url)).toBe(url);
      });

      it(`if query parameter matches and it's before the hash`, () => {
        const url = 'https://localhost:5601/app/kibana?testParam=(yes:!t)';
        expect(hashUrl(url)).toBe(url);
      });

      it('if empty hash without query', () => {
        const url = 'https://localhost:5601/app/kibana#';
        expect(hashUrl(url)).toBe(url);
      });

      it('if hash is just a path', () => {
        const url = 'https://localhost:5601/app/kibana#/discover';
        expect(hashUrl(url)).toBe(url);
      });

      it('if hash does not have matching query string vals', () => {
        const url = 'https://localhost:5601/app/kibana#/discover?foo=bar';
        expect(hashUrl(url)).toBe(url);
      });
    });

    describe('replaces expanded state with hash', () => {
      it('if uses single state param', () => {
        const stateParamKey = '_g';
        const stateParamValue = '(yes:!t)';
        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey}=${stateParamValue}`;
        const result = hashUrl(url);
        expect(result).toMatchInlineSnapshot(
          `"https://localhost:5601/app/kibana#/discover?foo=bar&_g=h@4e60e02"`
        );
        expect(mockStorage.getItem('kbn.hashedItemsIndex.v1')).toBeTruthy();
        expect(mockStorage.getItem('h@4e60e02')).toEqual(JSON.stringify({ yes: true }));
      });

      it('if uses multiple states params', () => {
        const stateParamKey1 = '_g';
        const stateParamValue1 = '(yes:!t)';
        const stateParamKey2 = '_a';
        const stateParamValue2 = '(yes:!f)';
        const stateParamKey3 = '_b';
        const stateParamValue3 = '(yes:!f)';
        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValue1}&${stateParamKey2}=${stateParamValue2}&${stateParamKey3}=${stateParamValue3}`;
        const result = hashUrl(url);
        expect(result).toMatchInlineSnapshot(
          `"https://localhost:5601/app/kibana#/discover?foo=bar&_g=h@4e60e02&_a=h@61fa078&_b=(yes:!f)"`
        );
        expect(mockStorage.getItem('h@4e60e02')).toEqual(JSON.stringify({ yes: true }));
        expect(mockStorage.getItem('h@61fa078')).toEqual(JSON.stringify({ yes: false }));
        if (!HashedItemStore.PERSISTED_INDEX_KEY) {
          // This is very brittle and depends upon HashedItemStore implementation details,
          // so let's protect ourselves from accidentally breaking this test.
          throw new Error('Missing HashedItemStore.PERSISTED_INDEX_KEY');
        }
        expect(mockStorage.getItem(HashedItemStore.PERSISTED_INDEX_KEY)).toBeTruthy();
        expect(mockStorage.length).toBe(3);
      });

      it('hashes only whitelisted properties', () => {
        const stateParamKey1 = '_g';
        const stateParamValue1 = '(yes:!t)';
        const stateParamKey2 = '_a';
        const stateParamValue2 = '(yes:!f)';
        const stateParamKey3 = '_someother';
        const stateParamValue3 = '(yes:!f)';
        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValue1}&${stateParamKey2}=${stateParamValue2}&${stateParamKey3}=${stateParamValue3}`;
        const result = hashUrl(url);
        expect(result).toMatchInlineSnapshot(
          `"https://localhost:5601/app/kibana#/discover?foo=bar&_g=h@4e60e02&_a=h@61fa078&_someother=(yes:!f)"`
        );

        expect(mockStorage.length).toBe(3); // 2 hashes + HashedItemStoreSingleton.PERSISTED_INDEX_KEY
      });
    });

    it('throws error if unable to hash url', () => {
      const stateParamKey1 = '_g';
      const stateParamValue1 = '(yes:!t)';
      mockStorage.setStubbedSizeLimit(1);

      const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValue1}`;
      expect(() => hashUrl(url)).toThrowError();
    });
  });

  describe('unhash url', () => {
    describe('does nothing', () => {
      it('if missing input', () => {
        expect(() => {
          // @ts-ignore
        }).not.toThrowError();
      });

      it('if just a host and port', () => {
        const url = 'https://localhost:5601';
        expect(unhashUrl(url)).toBe(url);
      });

      it('if just a path', () => {
        const url = 'https://localhost:5601/app/kibana';
        expect(unhashUrl(url)).toBe(url);
      });

      it('if just a path and query', () => {
        const url = 'https://localhost:5601/app/kibana?foo=bar';
        expect(unhashUrl(url)).toBe(url);
      });

      it('if empty hash with query', () => {
        const url = 'https://localhost:5601/app/kibana?foo=bar#';
        expect(unhashUrl(url)).toBe(url);
      });

      it('if empty hash without query', () => {
        const url = 'https://localhost:5601/app/kibana#';
        expect(unhashUrl(url)).toBe(url);
      });

      it('if hash is just a path', () => {
        const url = 'https://localhost:5601/app/kibana#/discover';
        expect(unhashUrl(url)).toBe(url);
      });

      it('if hash does not have matching query string vals', () => {
        const url = 'https://localhost:5601/app/kibana#/discover?foo=bar';
        expect(unhashUrl(url)).toBe(url);
      });

      it("if hash has matching query, but it isn't hashed", () => {
        const stateParamKey = '_g';
        const stateParamValue = '(yes:!t)';
        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey}=${stateParamValue}`;
        expect(unhashUrl(url)).toBe(url);
      });
    });

    describe('replaces expanded state with hash', () => {
      it('if uses single state param', () => {
        const stateParamKey = '_g';
        const stateParamValueHashed = 'h@4e60e02';
        const state = { yes: true };
        mockStorage.setItem(stateParamValueHashed, JSON.stringify(state));

        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey}=${stateParamValueHashed}`;
        const result = unhashUrl(url);
        expect(result).toMatchInlineSnapshot(
          `"https://localhost:5601/app/kibana#/discover?foo=bar&_g=(yes:!t)"`
        );
      });

      it('if uses multiple state param', () => {
        const stateParamKey1 = '_g';
        const stateParamValueHashed1 = 'h@4e60e02';
        const state1 = { yes: true };

        const stateParamKey2 = '_a';
        const stateParamValueHashed2 = 'h@61fa078';
        const state2 = { yes: false };

        mockStorage.setItem(stateParamValueHashed1, JSON.stringify(state1));
        mockStorage.setItem(stateParamValueHashed2, JSON.stringify(state2));

        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValueHashed1}&${stateParamKey2}=${stateParamValueHashed2}`;
        const result = unhashUrl(url);
        expect(result).toMatchInlineSnapshot(
          `"https://localhost:5601/app/kibana#/discover?foo=bar&_g=(yes:!t)&_a=(yes:!f)"`
        );
      });

      it('unhashes only whitelisted properties', () => {
        const stateParamKey1 = '_g';
        const stateParamValueHashed1 = 'h@4e60e02';
        const state1 = { yes: true };

        const stateParamKey2 = '_a';
        const stateParamValueHashed2 = 'h@61fa078';
        const state2 = { yes: false };

        const stateParamKey3 = '_someother';
        const stateParamValueHashed3 = 'h@61fa078';
        const state3 = { yes: false };

        mockStorage.setItem(stateParamValueHashed1, JSON.stringify(state1));
        mockStorage.setItem(stateParamValueHashed2, JSON.stringify(state2));
        mockStorage.setItem(stateParamValueHashed3, JSON.stringify(state3));

        const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValueHashed1}&${stateParamKey2}=${stateParamValueHashed2}&${stateParamKey3}=${stateParamValueHashed3}`;
        const result = unhashUrl(url);
        expect(result).toMatchInlineSnapshot(
          `"https://localhost:5601/app/kibana#/discover?foo=bar&_g=(yes:!t)&_a=(yes:!f)&_someother=h@61fa078"`
        );
      });
    });

    it('throws error if unable to restore the url', () => {
      const stateParamKey1 = '_g';
      const stateParamValueHashed1 = 'h@4e60e02';

      const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValueHashed1}`;
      expect(() => unhashUrl(url)).toThrowErrorMatchingInlineSnapshot(
        `"Unable to completely restore the URL, be sure to use the share functionality."`
      );
    });
  });

  describe('hash unhash url integration', () => {
    it('hashing and unhashing url should produce the same result', () => {
      const stateParamKey1 = '_g';
      const stateParamValue1 = '(yes:!t)';
      const stateParamKey2 = '_a';
      const stateParamValue2 = '(yes:!f)';
      const stateParamKey3 = '_someother';
      const stateParamValue3 = '(yes:!f)';
      const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=${stateParamValue1}&${stateParamKey2}=${stateParamValue2}&${stateParamKey3}=${stateParamValue3}`;
      const result = unhashUrl(hashUrl(url));
      expect(url).toEqual(result);
    });
  });
});
