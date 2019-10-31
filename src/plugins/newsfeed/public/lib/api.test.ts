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

import sinon, { stub } from 'sinon';
import moment from 'moment';
import { NEWSFEED_HASH_SET_STORAGE_KEY } from '../../constants';
import { ApiItem, NewsfeedItem } from '../../types';
import { NewsfeedApiDriver, getApi } from './api';

const localStorageGet = sinon.stub();
const sessionStoragetGet = sinon.stub();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: localStorageGet,
    setItem: stub(),
  },
  writable: true,
});
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: sessionStoragetGet,
    setItem: stub(),
  },
  writable: true,
});

describe('NewsfeedApiDriver', () => {
  const kibanaVersion = 'test_version';
  const userLanguage = 'en';
  const fetchInterval = 2000;
  const getDriver = () => new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);

  afterEach(() => {
    sinon.reset();
  });

  it('shouldFetch defaults to true', () => {
    const driver = getDriver();
    expect(driver.shouldFetch()).toBe(true);
  });

  describe('updateHashes', () => {
    it('returns previous and current storage', () => {
      const driver = getDriver();
      const items: NewsfeedItem[] = [
        {
          title: 'Good news, everyone!',
          description: 'good item description',
          linkText: 'click here',
          linkUrl: 'about:blank',
          badge: 'test',
          publishOn: moment(1572489035150),
          expireOn: moment(1572489047858),
          hash: 'hash1oneoneoneone',
        },
      ];
      expect(driver.updateHashes(items)).toMatchInlineSnapshot(`
        Object {
          "current": Array [
            "hash1oneoneoneone",
          ],
          "previous": Array [],
        }
      `);
    });

    it('replaces the previous hashes with the current', () => {
      localStorageGet.throws('Wrong key passed!');
      localStorageGet.withArgs(NEWSFEED_HASH_SET_STORAGE_KEY).returns('happyness');
      const driver = getDriver();
      const items: NewsfeedItem[] = [
        {
          title: 'Better news, everyone!',
          description: 'better item description',
          linkText: 'click there',
          linkUrl: 'about:blank',
          badge: 'concatentated',
          publishOn: moment(1572489035150),
          expireOn: moment(1572489047858),
          hash: 'three33hash',
        },
      ];
      expect(driver.updateHashes(items)).toMatchInlineSnapshot(`
        Object {
          "current": Array [
            "happyness",
            "three33hash",
          ],
          "previous": Array [
            "happyness",
          ],
        }
      `);
    });
  });

  it('Validates items for required fields', () => {
    const driver = getDriver();
    expect(driver.validateItem({})).toBe(false);
    expect(
      driver.validateItem({
        title: 'Gadzooks!',
        description: 'gadzooks item description',
        linkText: 'click here',
        linkUrl: 'about:blank',
        badge: 'test',
        publishOn: moment(1572489035150),
        expireOn: moment(1572489047858),
        hash: 'hash2twotwotwotwotwo',
      })
    ).toBe(true);
    expect(
      driver.validateItem({
        title: 'Gadzooks!',
        description: 'gadzooks item description',
        linkText: 'click here',
        linkUrl: 'about:blank',
        publishOn: moment(1572489035150),
        hash: 'hash2twotwotwotwotwo',
      })
    ).toBe(true);
    expect(
      driver.validateItem({
        title: 'Gadzooks!',
        description: 'gadzooks item description',
        linkText: 'click here',
        linkUrl: 'about:blank',
        publishOn: moment(1572489035150),
        // hash: 'hash2twotwotwotwotwo', // should fail because this is missing
      })
    ).toBe(false);
  });

  describe('modelItems', () => {
    it('Models empty set with defaults', () => {
      const driver = getDriver();
      const apiItems: ApiItem[] = [];
      expect(driver.modelItems(apiItems)).toMatchInlineSnapshot(`
        Object {
          "error": null,
          "feedItems": Array [],
          "hasNew": false,
          "kibanaVersion": "test_version",
        }
      `);
    });

    it('Selects default language', () => {
      const driver = getDriver();
      const apiItems: ApiItem[] = [
        {
          title: {
            en: 'speaking English',
            es: 'habla Espanol',
          },
          description: {
            en: 'language test',
            es: 'idiomas',
          },
          languages: ['en', 'es'],
          link_text: {
            en: 'click here',
            es: 'aqui',
          },
          link_url: {
            en: 'xyzxyzxyz',
            es: 'abcabc',
          },
          badge: {
            en: 'firefighter',
            es: 'bombero',
          },
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('2049-10-31T04:23:47Z'),
          hash: 'abcabc1231123123hash',
        },
      ];
      expect(driver.modelItems(apiItems)).toMatchObject({
        error: null,
        feedItems: [
          {
            badge: 'firefighter',
            description: 'language test',
            hash: 'abcabc1231',
            linkText: 'click here',
            linkUrl: 'xyzxyzxyz',
            title: 'speaking English',
          },
        ],
        hasNew: true,
        kibanaVersion: 'test_version',
      });
    });

    it('Models multiple', () => {
      const driver = getDriver();
      const apiItems: ApiItem[] = [
        {
          title: {
            en: 'guess what',
          },
          description: {
            en: 'this tests the modelItems function',
          },
          link_text: {
            en: 'click here',
          },
          link_url: {
            en: 'about:blank',
          },
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('2049-10-31T04:23:47Z'),
          hash: 'abcabc1231123123hash',
        },
        {
          title: {
            en: 'guess when',
          },
          description: {
            en: 'this also tests the modelItems function',
          },
          link_text: {
            en: 'click here',
          },
          link_url: {
            en: 'about:blank',
          },
          badge: {
            en: 'hero',
          },
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('2049-10-31T04:23:47Z'),
          hash: 'defdefdef456456456',
        },
      ];
      expect(driver.modelItems(apiItems)).toMatchObject({
        error: null,
        feedItems: [
          {
            badge: null,
            description: 'this tests the modelItems function',
            hash: 'abcabc1231',
            linkText: 'click here',
            linkUrl: 'about:blank',
            title: 'guess what',
          },
          {
            badge: 'hero',
            description: 'this also tests the modelItems function',
            hash: 'defdefdef4',
            linkText: 'click here',
            linkUrl: 'about:blank',
            title: 'guess when',
          },
        ],
        hasNew: true,
        kibanaVersion: 'test_version',
      });
    });

    it('Filters multiple', () => {
      const driver = getDriver();
      const apiItems: ApiItem[] = [
        {
          title: {
            en: 'guess what',
          },
          description: {
            en: 'this tests the modelItems function',
          },
          link_text: {
            en: 'click here',
          },
          link_url: {
            en: 'about:blank',
          },
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('2049-10-31T04:23:47Z'),
          hash: 'abcabc1231123123hash',
        }, // preserve
        {
          title: {
            es: 'Espanol',
          },
          description: {
            es: 'this also tests the modelItems function',
          },
          link_text: {
            es: 'click here',
          },
          link_url: {
            es: 'about:blank',
          },
          badge: {
            es: 'hero',
          },
          languages: ['es'],
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('2049-10-31T04:23:47Z'),
          hash: 'defdefdef456456456',
        }, // filter: not english
        {
          title: {
            en: 'this is expired',
          },
          description: {
            en: 'this also tests the modelItems function',
          },
          link_text: {
            en: 'click here',
          },
          link_url: {
            en: 'about:blank',
          },
          badge: {
            en: 'hero',
          },
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('1999-01-01T00:00:00Z'),
          hash: 'defdefdef456456456',
        }, // filter: expired
      ];
      expect(driver.modelItems(apiItems)).toMatchObject({
        error: null,
        feedItems: [
          {
            badge: null,
            description: 'this tests the modelItems function',
            hash: 'abcabc1231',
            linkText: 'click here',
            linkUrl: 'about:blank',
            title: 'guess what',
          },
        ],
        hasNew: true,
        kibanaVersion: 'test_version',
      });
    });
  });
});

describe('getApi', () => {
  it('pipelines the Driver methods together', () => {
    const api$ = getApi();
  });
});
