/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../../storage/hashed_item_store/mock';
import {
  History,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  createPath,
} from 'history';
import {
  getRelativeToHistoryPath,
  createKbnUrlControls,
  IKbnUrlControls,
  setStateToKbnUrl,
  getStateFromKbnUrl,
} from './kbn_url_storage';
import { ScopedHistory } from '@kbn/core/public';

describe('kbn_url_storage', () => {
  describe('getStateFromUrl & setStateToUrl', () => {
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
      const retrievedState1 = getStateFromKbnUrl('_s', newUrl);
      expect(retrievedState1).toEqual(state1);

      newUrl = setStateToKbnUrl('_s', state2, { useHash: false }, newUrl);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=(test:'123')"`
      );
      const retrievedState2 = getStateFromKbnUrl('_s', newUrl);
      expect(retrievedState2).toEqual(state2);
    });

    it('should set expanded state to url before hash', () => {
      let newUrl = setStateToKbnUrl('_s', state1, { useHash: false, storeInHashQuery: false }, url);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana?_s=(testArray:!(1,2,()),testNull:!n,testNumber:0,testObj:(test:'123'),testStr:'123')#/yourApp"`
      );
      const retrievedState1 = getStateFromKbnUrl('_s', newUrl, { getFromHashQuery: false });
      expect(retrievedState1).toEqual(state1);

      newUrl = setStateToKbnUrl('_s', state2, { useHash: false, storeInHashQuery: false }, newUrl);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana?_s=(test:'123')#/yourApp"`
      );
      const retrievedState2 = getStateFromKbnUrl('_s', newUrl, { getFromHashQuery: false });
      expect(retrievedState2).toEqual(state2);
    });

    it('should set hashed state to url', () => {
      let newUrl = setStateToKbnUrl('_s', state1, { useHash: true }, url);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=h@a897fac"`
      );
      const retrievedState1 = getStateFromKbnUrl('_s', newUrl);
      expect(retrievedState1).toEqual(state1);

      newUrl = setStateToKbnUrl('_s', state2, { useHash: true }, newUrl);
      expect(newUrl).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#/yourApp?_s=h@40f94d5"`
      );
      const retrievedState2 = getStateFromKbnUrl('_s', newUrl);
      expect(retrievedState2).toEqual(state2);
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

  describe('urlControls', () => {
    let history: History;
    let urlControls: IKbnUrlControls;
    beforeEach(() => {
      history = createMemoryHistory();
      urlControls = createKbnUrlControls(history);
      urlControls.update('/', true);
    });

    const getCurrentUrl = () => createPath(history.location);
    it('should update url', () => {
      urlControls.update('/1', false);

      expect(getCurrentUrl()).toBe('/1');
      expect(history.length).toBe(2);

      urlControls.update('/2', true);

      expect(getCurrentUrl()).toBe('/2');
      expect(history.length).toBe(2);
    });

    it('should update url async', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', false);
      const pr2 = urlControls.updateAsync(() => '/2', false);
      const pr3 = urlControls.updateAsync(() => '/3', false);
      expect(getCurrentUrl()).toBe('/');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/3');
    });

    it('should push url state if at least 1 push in async chain', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', true);
      const pr2 = urlControls.updateAsync(() => '/2', false);
      const pr3 = urlControls.updateAsync(() => '/3', true);
      expect(getCurrentUrl()).toBe('/');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/3');
      expect(history.length).toBe(2);
    });

    it('should replace url state if all updates in async chain are replace', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', true);
      const pr2 = urlControls.updateAsync(() => '/2', true);
      const pr3 = urlControls.updateAsync(() => '/3', true);
      expect(getCurrentUrl()).toBe('/');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/3');
      expect(history.length).toBe(1);
    });

    it('should listen for url updates', async () => {
      const cb = jest.fn();
      urlControls.listen(cb);
      const pr1 = urlControls.updateAsync(() => '/1', true);
      const pr2 = urlControls.updateAsync(() => '/2', true);
      const pr3 = urlControls.updateAsync(() => '/3', true);
      await Promise.all([pr1, pr2, pr3]);

      urlControls.update('/4', false);
      urlControls.update('/5', true);

      expect(cb).toHaveBeenCalledTimes(3);
    });

    it('flush should take priority over regular replace behaviour', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', true);
      const pr2 = urlControls.updateAsync(() => '/2', false);
      const pr3 = urlControls.updateAsync(() => '/3', true);
      urlControls.flush(false);
      expect(getCurrentUrl()).toBe('/3');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/3');
      expect(history.length).toBe(2);
    });

    it('should cancel async url updates', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', true);
      const pr2 = urlControls.updateAsync(() => '/2', false);
      const pr3 = urlControls.updateAsync(() => '/3', true);
      urlControls.cancel();
      expect(getCurrentUrl()).toBe('/');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/');
    });

    it('should retrieve pending url ', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', true);
      const pr2 = urlControls.updateAsync(() => '/2', false);
      const pr3 = urlControls.updateAsync(() => '/3', true);
      expect(urlControls.getPendingUrl()).toEqual('/3');
      expect(getCurrentUrl()).toBe('/');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/3');

      expect(urlControls.getPendingUrl()).toBeUndefined();
    });
  });

  describe('urlControls - browser history integration', () => {
    let history: History;
    let urlControls: IKbnUrlControls;
    beforeEach(() => {
      history = createBrowserHistory();
      urlControls = createKbnUrlControls(history);
      urlControls.update('/', true);
    });

    const getCurrentUrl = () => history.createHref(history.location);

    it('should flush async url updates', async () => {
      const pr1 = urlControls.updateAsync(() => '/1', false);
      const pr2 = urlControls.updateAsync(() => '/2', false);
      const pr3 = urlControls.updateAsync(() => '/3', false);
      expect(getCurrentUrl()).toBe('/');
      expect(urlControls.flush()).toBe('/3');
      expect(getCurrentUrl()).toBe('/3');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/3');
    });

    it('flush() should return undefined, if no url updates happened', () => {
      expect(urlControls.flush()).toBeUndefined();
      urlControls.updateAsync(() => '/1', false);
      urlControls.updateAsync(() => '/', false);
      expect(urlControls.flush()).toBeUndefined();
    });
  });

  describe('urlControls - scoped history integration', () => {
    let history: History;
    let urlControls: IKbnUrlControls;
    beforeEach(() => {
      const parentHistory = createBrowserHistory();
      parentHistory.replace('/app/kibana/');
      history = new ScopedHistory(parentHistory, '/app/kibana/');
      urlControls = createKbnUrlControls(history);
    });

    const getCurrentUrl = () => history.createHref(history.location);

    it('should flush async url updates', async () => {
      const pr1 = urlControls.updateAsync(() => '/app/kibana/1', false);
      const pr2 = urlControls.updateAsync(() => '/app/kibana/2', false);
      const pr3 = urlControls.updateAsync(() => '/app/kibana/3', false);
      expect(getCurrentUrl()).toBe('/app/kibana/');
      expect(urlControls.flush()).toBe('/app/kibana/3');
      expect(getCurrentUrl()).toBe('/app/kibana/3');
      await Promise.all([pr1, pr2, pr3]);
      expect(getCurrentUrl()).toBe('/app/kibana/3');
    });

    it('flush() should return undefined, if no url updates happened', () => {
      expect(urlControls.flush()).toBeUndefined();
      urlControls.updateAsync(() => '/app/kibana/1', false);
      urlControls.updateAsync(() => '/app/kibana/', false);
      expect(urlControls.flush()).toBeUndefined();
    });
  });

  describe('getRelativeToHistoryPath', () => {
    it('should extract path relative to browser history without basename', () => {
      const history = createBrowserHistory();
      const url =
        "http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual(
        "/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );
    });

    it('should extract path relative to browser history with basename', () => {
      const url =
        "http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const history1 = createBrowserHistory({ basename: '/oxf/app/' });
      const relativePath1 = getRelativeToHistoryPath(url, history1);
      expect(relativePath1).toEqual(
        "/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')"
      );

      const history2 = createBrowserHistory({ basename: '/oxf/app/kibana/' });
      const relativePath2 = getRelativeToHistoryPath(url, history2);
      expect(relativePath2).toEqual("#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')");
    });

    it('should extract path relative to browser history with basename from relative url', () => {
      const history = createBrowserHistory({ basename: '/oxf/app/' });
      const url = "/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual("/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')");
    });

    it('should extract path relative to hash history without basename', () => {
      const history = createHashHistory();
      const url =
        "http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual("/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')");
    });

    it('should extract path relative to hash history with basename', () => {
      const history = createHashHistory({ basename: 'management' });
      const url =
        "http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual("/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')");
    });

    it('should extract path relative to hash history with basename from relative url', () => {
      const history = createHashHistory({ basename: 'management' });
      const url = "/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')";
      const relativePath = getRelativeToHistoryPath(url, history);
      expect(relativePath).toEqual("/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')");
    });
  });
});
