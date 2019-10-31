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

import moment from 'moment';
import { ApiItem, NewsfeedItem, FetchResult } from '../../types';
import { NewsfeedApiDriver } from './api';

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => undefined), // for hash
    setItem: jest.fn(() => null),
  },
  writable: true,
});
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(() => undefined), // for last update time
    setItem: jest.fn(() => null),
  },
  writable: true,
});

describe('NewsfeedApiDriver', () => {
  const kibanaVersion = 'test_version';
  const userLanguage = 'en';
  const fetchInterval = 2000;

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shouldFetch defaults to true', () => {
    const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);
    expect(driver.shouldFetch()).toBe(true);
  });

  it('updatedHashes returns previous and current storage', () => {
    const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);

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

    // TODO: test concatenation
  });

  it('Validates items for required fields', () => {
    const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);
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
    it('Models empty set with defaults', done => {
      const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);
      const apiItems: ApiItem[] = [];

      driver.modelItems(apiItems).subscribe((feedItems: FetchResult) => {
        expect(feedItems).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "feedItems": Array [],
            "hasNew": false,
            "kibanaVersion": "test_version",
          }
        `);
        done();
      });
    });

    it('Selects default language', done => {
      const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);
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

      driver.modelItems(apiItems).subscribe((feedItems: FetchResult) => {
        expect(feedItems).toMatchObject({
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
        done();
      });
    });

    it('Models multiple', done => {
      const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);
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

      driver.modelItems(apiItems).subscribe((feedItems: FetchResult) => {
        expect(feedItems).toMatchObject({
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
        done();
      });
    });

    it('Filters multiple', done => {
      const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);
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

      driver.modelItems(apiItems).subscribe((feedItems: FetchResult) => {
        expect(feedItems).toMatchObject({
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
        done();
      });
    });
  });
});
