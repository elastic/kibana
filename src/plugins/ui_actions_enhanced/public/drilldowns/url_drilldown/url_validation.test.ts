/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateUrl, validateUrlTemplate } from './url_validation';

describe('validateUrl', () => {
  describe('unsafe urls', () => {
    const unsafeUrls = [
      // eslint-disable-next-line no-script-url
      'javascript:evil()',
      // eslint-disable-next-line no-script-url
      'JavaScript:abc',
      'evilNewProtocol:abc',
      ' \n Java\n Script:abc',
      '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;',
      '&#106&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;',
      '&#106 &#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;',
      '&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058',
      '&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A;',
      'jav&#x09;ascript:alert();',
      // 'jav\u0000ascript:alert();', CI fails on this one
      'data:;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/',
      'data:,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/',
      'data:iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/',
      'data:text/javascript;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/',
      'data:application/x-msdownload;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/',
    ];

    for (const url of unsafeUrls) {
      test(`unsafe ${url}`, () => {
        expect(validateUrl(url).isValid).toBe(false);
      });
    }
  });

  describe('invalid urls', () => {
    const invalidUrls = ['elastic.co', 'www.elastic.co', 'test', '', ' ', 'https://'];
    for (const url of invalidUrls) {
      test(`invalid ${url}`, () => {
        expect(validateUrl(url).isValid).toBe(false);
      });
    }
  });

  describe('valid urls', () => {
    const validUrls = [
      'https://elastic.co',
      'https://www.elastic.co',
      'http://elastic',
      'mailto:someone',
    ];
    for (const url of validUrls) {
      test(`valid ${url}`, () => {
        expect(validateUrl(url).isValid).toBe(true);
      });
    }
  });
});

describe('validateUrlTemplate', () => {
  test('domain in variable is allowed', async () => {
    expect(
      (
        await validateUrlTemplate(
          { template: '{{kibanaUrl}}/test' },
          { kibanaUrl: 'http://localhost:5601/app' }
        )
      ).isValid
    ).toBe(true);
  });

  test('unsafe domain in variable is not allowed', async () => {
    expect(
      (
        await validateUrlTemplate(
          { template: '{{kibanaUrl}}/test' },
          // eslint-disable-next-line no-script-url
          { kibanaUrl: 'javascript:evil()' }
        )
      ).isValid
    ).toBe(false);
  });

  test('if missing variable then invalid', async () => {
    expect(
      (
        await validateUrlTemplate(
          { template: '{{url}}/test' },
          { kibanaUrl: 'http://localhost:5601/app' }
        )
      ).isValid
    ).toBe(false);
  });
});
