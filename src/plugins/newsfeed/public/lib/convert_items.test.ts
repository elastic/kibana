/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { omit } from 'lodash';
import { validateIntegrity, validatePublishedDate, localizeItem } from './convert_items';
import type { ApiItem, NewsfeedItem } from '../types';

const createApiItem = (parts: Partial<ApiItem> = {}): ApiItem => ({
  hash: 'hash',
  expire_on: new Date(),
  publish_on: new Date(),
  title: {},
  description: {},
  link_url: {},
  ...parts,
});

const createNewsfeedItem = (parts: Partial<NewsfeedItem> = {}): NewsfeedItem => ({
  title: 'title',
  description: 'description',
  linkText: 'linkText',
  linkUrl: 'linkUrl',
  badge: 'badge',
  publishOn: moment(),
  expireOn: moment(),
  hash: 'hash',
  ...parts,
});

describe('localizeItem', () => {
  let item: ApiItem;

  beforeEach(() => {
    item = createApiItem({
      languages: ['en', 'fr'],
      title: {
        en: 'en title',
        fr: 'fr title',
      },
      description: {
        en: 'en desc',
        fr: 'fr desc',
      },
      link_text: {
        en: 'en link text',
        fr: 'fr link text',
      },
      link_url: {
        en: 'en link url',
        fr: 'fr link url',
      },
      badge: {
        en: 'en badge',
        fr: 'fr badge',
      },
      publish_on: new Date('2014-10-31T04:23:47Z'),
      expire_on: new Date('2049-10-31T04:23:47Z'),
      hash: 'hash',
    });
  });

  it('converts api items to newsfeed items using the specified language', () => {
    expect(localizeItem(item, 'fr')).toMatchObject({
      title: 'fr title',
      description: 'fr desc',
      linkText: 'fr link text',
      linkUrl: 'fr link url',
      badge: 'fr badge',
      hash: 'hash',
    });
  });

  it('fallbacks to `en` is the language is not present', () => {
    expect(localizeItem(item, 'de')).toMatchObject({
      title: 'en title',
      description: 'en desc',
      linkText: 'en link text',
      linkUrl: 'en link url',
      badge: 'en badge',
      hash: 'hash',
    });
  });

  it('uses the fallback language when `languages` is `null`', () => {
    item = createApiItem({
      languages: null,
      title: {
        en: 'en title',
      },
      description: {
        en: 'en desc',
      },
      link_text: {
        en: 'en link text',
      },
      link_url: {
        en: 'en link url',
      },
      badge: {
        en: 'en badge',
      },
      publish_on: new Date('2014-10-31T04:23:47Z'),
      expire_on: new Date('2049-10-31T04:23:47Z'),
      hash: 'hash',
    });

    expect(localizeItem(item, 'fr')).toMatchObject({
      title: 'en title',
      description: 'en desc',
      linkText: 'en link text',
      linkUrl: 'en link url',
      badge: 'en badge',
      hash: 'hash',
    });
  });
});

describe('validatePublishedDate', () => {
  it('returns false when the publish date is not reached yet', () => {
    expect(
      validatePublishedDate(
        createApiItem({
          publish_on: new Date('2055-10-31T04:23:47Z'), // too new
          expire_on: new Date('2056-10-31T04:23:47Z'),
        })
      )
    ).toBe(false);
  });

  it('returns false when the expire date is already reached', () => {
    expect(
      validatePublishedDate(
        createApiItem({
          publish_on: new Date('2013-10-31T04:23:47Z'),
          expire_on: new Date('2014-10-31T04:23:47Z'), // too old
        })
      )
    ).toBe(false);
  });

  it('returns true when current date is between the publish and expire dates', () => {
    expect(
      validatePublishedDate(
        createApiItem({
          publish_on: new Date('2014-10-31T04:23:47Z'),
          expire_on: new Date('2049-10-31T04:23:47Z'),
        })
      )
    ).toBe(true);
  });
});

describe('validateIntegrity', () => {
  it('returns false if `title` is missing', () => {
    expect(validateIntegrity(omit(createNewsfeedItem(), 'title'))).toBe(false);
  });
  it('returns false if `description` is missing', () => {
    expect(validateIntegrity(omit(createNewsfeedItem(), 'description'))).toBe(false);
  });
  it('returns false if `linkText` is missing', () => {
    expect(validateIntegrity(omit(createNewsfeedItem(), 'linkText'))).toBe(false);
  });
  it('returns false if `linkUrl` is missing', () => {
    expect(validateIntegrity(omit(createNewsfeedItem(), 'linkUrl'))).toBe(false);
  });
  it('returns false if `publishOn` is missing', () => {
    expect(validateIntegrity(omit(createNewsfeedItem(), 'publishOn'))).toBe(false);
  });
  it('returns false if `hash` is missing', () => {
    expect(validateIntegrity(omit(createNewsfeedItem(), 'hash'))).toBe(false);
  });
  it('returns true if all mandatory fields are present', () => {
    expect(validateIntegrity(createNewsfeedItem())).toBe(true);
  });
});
