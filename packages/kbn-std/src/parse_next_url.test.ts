/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseNextURL } from './parse_next_url';

describe('parseNextURL', () => {
  it('should return a function', () => {
    expect(parseNextURL).toBeInstanceOf(Function);
  });

  describe('with basePath defined', () => {
    // trailing slash is important since it must match the cookie path exactly
    it('should return basePath with a trailing slash when next is not specified', () => {
      const basePath = '/iqf';
      const href = `${basePath}/login`;
      expect(parseNextURL(href, basePath)).toEqual(`${basePath}/`);
    });

    it('should properly handle next without hash', () => {
      const basePath = '/iqf';
      const next = `${basePath}/app/kibana`;
      const href = `${basePath}/login?next=${next}`;
      expect(parseNextURL(href, basePath)).toEqual(next);
    });

    it('should properly handle next with hash', () => {
      const basePath = '/iqf';
      const next = `${basePath}/app/kibana`;
      const hash = '/discover/New-Saved-Search';
      const href = `${basePath}/login?next=${next}#${hash}`;
      expect(parseNextURL(href, basePath)).toEqual(`${next}#${hash}`);
    });

    it('should properly handle multiple next with hash', () => {
      const basePath = '/iqf';
      const next1 = `${basePath}/app/kibana`;
      const next2 = `${basePath}/app/ml`;
      const hash = '/discover/New-Saved-Search';
      const href = `${basePath}/login?next=${next1}&next=${next2}#${hash}`;
      expect(parseNextURL(href, basePath)).toEqual(`${next1}#${hash}`);
    });

    it('should properly decode special characters', () => {
      const basePath = '/iqf';
      const next = `${encodeURIComponent(basePath)}%2Fapp%2Fkibana`;
      const hash = '/discover/New-Saved-Search';
      const href = `${basePath}/login?next=${next}#${hash}`;
      expect(parseNextURL(href, basePath)).toEqual(decodeURIComponent(`${next}#${hash}`));
    });

    // to help prevent open redirect to a different url
    it('should return basePath if next includes a protocol/hostname', () => {
      const basePath = '/iqf';
      const next = `https://example.com${basePath}/app/kibana`;
      const href = `${basePath}/login?next=${next}`;
      expect(parseNextURL(href, basePath)).toEqual(`${basePath}/`);
    });

    // to help prevent open redirect to a different url by abusing encodings
    it('should return basePath if including a protocol/host even if it is encoded', () => {
      const basePath = '/iqf';
      const baseUrl = `http://example.com${basePath}`;
      const next = `${encodeURIComponent(baseUrl)}%2Fapp%2Fkibana`;
      const hash = '/discover/New-Saved-Search';
      const href = `${basePath}/login?next=${next}#${hash}`;
      expect(parseNextURL(href, basePath)).toEqual(`${basePath}/`);
    });

    // to help prevent open redirect to a different port
    it('should return basePath if next includes a port', () => {
      const basePath = '/iqf';
      const next = `http://localhost:5601${basePath}/app/kibana`;
      const href = `${basePath}/login?next=${next}`;
      expect(parseNextURL(href, basePath)).toEqual(`${basePath}/`);
    });

    // to help prevent open redirect to a different port by abusing encodings
    it('should return basePath if including a port even if it is encoded', () => {
      const basePath = '/iqf';
      const baseUrl = `http://example.com:5601${basePath}`;
      const next = `${encodeURIComponent(baseUrl)}%2Fapp%2Fkibana`;
      const hash = '/discover/New-Saved-Search';
      const href = `${basePath}/login?next=${next}#${hash}`;
      expect(parseNextURL(href, basePath)).toEqual(`${basePath}/`);
    });

    // to help prevent open redirect to a different base path
    it('should return basePath if next does not begin with basePath', () => {
      const basePath = '/iqf';
      const next = '/notbasepath/app/kibana';
      const href = `${basePath}/login?next=${next}`;
      expect(parseNextURL(href, basePath)).toEqual(`${basePath}/`);
    });

    // disallow network-path references
    it('should return / if next is url without protocol', () => {
      const nextWithTwoSlashes = '//example.com';
      const hrefWithTwoSlashes = `/login?next=${nextWithTwoSlashes}`;
      expect(parseNextURL(hrefWithTwoSlashes)).toEqual('/');

      const nextWithThreeSlashes = '///example.com';
      const hrefWithThreeSlashes = `/login?next=${nextWithThreeSlashes}`;
      expect(parseNextURL(hrefWithThreeSlashes)).toEqual('/');
    });
  });

  describe('without basePath defined', () => {
    // trailing slash is important since it must match the cookie path exactly
    it('should return / with a trailing slash when next is not specified', () => {
      const href = '/login';
      expect(parseNextURL(href)).toEqual('/');
    });

    it('should properly handle next without hash', () => {
      const next = '/app/kibana';
      const href = `/login?next=${next}`;
      expect(parseNextURL(href)).toEqual(next);
    });

    it('should properly handle next with hash', () => {
      const next = '/app/kibana';
      const hash = '/discover/New-Saved-Search';
      const href = `/login?next=${next}#${hash}`;
      expect(parseNextURL(href)).toEqual(`${next}#${hash}`);
    });

    it('should properly handle multiple next with hash', () => {
      const next1 = '/app/kibana';
      const next2 = '/app/ml';
      const hash = '/discover/New-Saved-Search';
      const href = `/login?next=${next1}&next=${next2}#${hash}`;
      expect(parseNextURL(href)).toEqual(`${next1}#${hash}`);
    });

    it('should properly decode special characters', () => {
      const next = '%2Fapp%2Fkibana';
      const hash = '/discover/New-Saved-Search';
      const href = `/login?next=${next}#${hash}`;
      expect(parseNextURL(href)).toEqual(decodeURIComponent(`${next}#${hash}`));
    });

    // to help prevent open redirect to a different url
    it('should return / if next includes a protocol/hostname', () => {
      const next = 'https://example.com/app/kibana';
      const href = `/login?next=${next}`;
      expect(parseNextURL(href)).toEqual('/');
    });

    // to help prevent open redirect to a different url by abusing encodings
    it('should return / if including a protocol/host even if it is encoded', () => {
      const baseUrl = 'http://example.com';
      const next = `${encodeURIComponent(baseUrl)}%2Fapp%2Fkibana`;
      const hash = '/discover/New-Saved-Search';
      const href = `/login?next=${next}#${hash}`;
      expect(parseNextURL(href)).toEqual('/');
    });

    // to help prevent open redirect to a different port
    it('should return / if next includes a port', () => {
      const next = 'http://localhost:5601/app/kibana';
      const href = `/login?next=${next}`;
      expect(parseNextURL(href)).toEqual('/');
    });

    // to help prevent open redirect to a different port by abusing encodings
    it('should return / if including a port even if it is encoded', () => {
      const baseUrl = 'http://example.com:5601';
      const next = `${encodeURIComponent(baseUrl)}%2Fapp%2Fkibana`;
      const hash = '/discover/New-Saved-Search';
      const href = `/login?next=${next}#${hash}`;
      expect(parseNextURL(href)).toEqual('/');
    });

    // disallow network-path references
    it('should return / if next is url without protocol', () => {
      const nextWithTwoSlashes = '//example.com';
      const hrefWithTwoSlashes = `/login?next=${nextWithTwoSlashes}`;
      expect(parseNextURL(hrefWithTwoSlashes)).toEqual('/');

      const nextWithThreeSlashes = '///example.com';
      const hrefWithThreeSlashes = `/login?next=${nextWithThreeSlashes}`;
      expect(parseNextURL(hrefWithThreeSlashes)).toEqual('/');
    });
  });
});
