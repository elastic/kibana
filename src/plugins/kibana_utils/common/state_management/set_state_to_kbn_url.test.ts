/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSetStateToKbnUrl, setStateToKbnUrl } from './set_state_to_kbn_url';

describe('set_state_to_kbn_url', () => {
  describe('createSetStateToKbnUrl', () => {
    it('should call createHash', () => {
      const createHash = jest.fn(() => 'hash');
      const localSetStateToKbnUrl = createSetStateToKbnUrl(createHash);
      const url = 'http://localhost:5601/oxf/app/kibana#/yourApp';
      const state = { foo: 'bar' };
      const newUrl = localSetStateToKbnUrl('_s', state, { useHash: true }, url);
      expect(createHash).toHaveBeenCalledTimes(1);
      expect(createHash).toHaveBeenCalledWith(state);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=hash"`
      );
    });

    it('should not call createHash', () => {
      const createHash = jest.fn();
      const localSetStateToKbnUrl = createSetStateToKbnUrl(createHash);
      const url = 'http://localhost:5601/oxf/app/kibana#/yourApp';
      const state = { foo: 'bar' };
      const newUrl = localSetStateToKbnUrl('_s', state, { useHash: false }, url);
      expect(createHash).not.toHaveBeenCalled();
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=(foo:bar)"`
      );
    });
  });

  describe('setStateToKbnUrl', () => {
    const url = 'http://localhost:5601/oxf/app/kibana#/yourApp';
    const state1 = {
      testStr: '123',
      testNumber: 0,
      testObj: { test: '123' },
      testNull: null,
      testArray: [1, 2, {}],
    };
    const state2 = {
      test: '123',
    };

    it('should set expanded state to url', () => {
      let newUrl = setStateToKbnUrl('_s', state1, { useHash: false }, url);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=(testArray:!(1,2,()),testNull:!n,testNumber:0,testObj:(test:'123'),testStr:'123')"`
      );
      newUrl = setStateToKbnUrl('_s', state2, { useHash: false }, newUrl);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=(test:'123')"`
      );
    });

    it('should set expanded state to url before hash', () => {
      let newUrl = setStateToKbnUrl('_s', state1, { useHash: false, storeInHashQuery: false }, url);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana?_s=(testArray:!(1,2,()),testNull:!n,testNumber:0,testObj:(test:'123'),testStr:'123')#/yourApp"`
      );
      newUrl = setStateToKbnUrl('_s', state2, { useHash: false, storeInHashQuery: false }, newUrl);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana?_s=(test:'123')#/yourApp"`
      );
    });

    it('should set hashed state to url', () => {
      let newUrl = setStateToKbnUrl('_s', state1, { useHash: true }, url);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=h@a897fac"`
      );
      newUrl = setStateToKbnUrl('_s', state2, { useHash: true }, newUrl);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=h@40f94d5"`
      );
    });

    it('should set query to url with storeInHashQuery: false', () => {
      let newUrl = setStateToKbnUrl(
        '_a',
        { tab: 'other' },
        { useHash: false, storeInHashQuery: false },
        'http://localhost:5601/oxf/app/kibana/yourApp'
      );
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana/yourApp?_a=(tab:other)"`
      );
      newUrl = setStateToKbnUrl(
        '_b',
        { f: 'test', i: '', l: '' },
        { useHash: false, storeInHashQuery: false },
        newUrl
      );
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana/yourApp?_a=(tab:other)&_b=(f:test,i:'',l:'')"`
      );
    });
  });
});
