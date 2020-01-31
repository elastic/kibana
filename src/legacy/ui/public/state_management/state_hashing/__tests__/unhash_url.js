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
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { StateProvider } from '../../state';
import { unhashUrl } from '..';

describe('unhashUrl', () => {
  let unhashableStates;

  beforeEach(ngMock.module('kibana'));

  beforeEach(
    ngMock.inject(Private => {
      const State = Private(StateProvider);
      const unhashableState = new State('testParam');
      sinon
        .stub(unhashableState, 'translateHashToRison')
        .withArgs('hash')
        .returns('replacement');
      unhashableStates = [unhashableState];
    })
  );

  describe('does nothing', () => {
    it('if missing input', () => {
      expect(() => {
        unhashUrl();
      }).to.not.throwError();
    });

    it('if just a host and port', () => {
      const url = 'https://localhost:5601';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if just a path', () => {
      const url = 'https://localhost:5601/app/kibana';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if just a path and query', () => {
      const url = 'https://localhost:5601/app/kibana?foo=bar';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if empty hash with query', () => {
      const url = 'https://localhost:5601/app/kibana?foo=bar#';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if empty hash without query', () => {
      const url = 'https://localhost:5601/app/kibana#';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if hash is just a path', () => {
      const url = 'https://localhost:5601/app/kibana#/discover';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if hash does not have matching query string vals', () => {
      const url = 'https://localhost:5601/app/kibana#/discover?foo=bar';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });
  });

  it('replaces query string vals in hash for matching states with output of state.toRISON()', () => {
    const urlWithHashes = 'https://localhost:5601/#/?foo=bar&testParam=hash';
    const exp = 'https://localhost:5601/#/?foo=bar&testParam=replacement';
    expect(unhashUrl(urlWithHashes, unhashableStates)).to.be(exp);
  });
});
