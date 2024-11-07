/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isInternalURL } from './is_internal_url';

describe('isInternalURL', () => {
  describe('with basePath defined', () => {
    const basePath = '/iqf';

    it('should return `true `if URL includes hash fragment', () => {
      const href = `${basePath}/app/kibana#/discover/New-Saved-Search`;
      expect(isInternalURL(href, basePath)).toBe(true);
    });

    it('should return `false` if URL includes a protocol/hostname', () => {
      const href = `https://example.com${basePath}/app/kibana`;
      expect(isInternalURL(href, basePath)).toBe(false);
    });

    it('should return `false` if URL includes a port', () => {
      const href = `http://localhost:5601${basePath}/app/kibana`;
      expect(isInternalURL(href, basePath)).toBe(false);
    });

    it('should return `false` if URL does not specify protocol', () => {
      const hrefWithTwoSlashes = `/${basePath}/app/kibana`;
      expect(isInternalURL(hrefWithTwoSlashes)).toBe(false);

      const hrefWithThreeSlashes = `//${basePath}/app/kibana`;
      expect(isInternalURL(hrefWithThreeSlashes)).toBe(false);
    });

    it('should return `true` if URL starts with a basepath', () => {
      for (const href of [basePath, `${basePath}/`, `${basePath}/login`, `${basePath}/login/`]) {
        expect(isInternalURL(href, basePath)).toBe(true);
      }
    });

    it('should return `false` if URL does not start with basePath', () => {
      for (const href of [
        '/notbasepath/app/kibana',
        `${basePath}_/login`,
        basePath.slice(1),
        `${basePath.slice(1)}/app/kibana`,
      ]) {
        expect(isInternalURL(href, basePath)).toBe(false);
      }
    });

    it('should return `true` if relative path does not escape base path', () => {
      const href = `${basePath}/app/kibana/../../management`;
      expect(isInternalURL(href, basePath)).toBe(true);
    });

    it('should return `false` if relative path escapes base path', () => {
      const href = `${basePath}/app/kibana/../../../management`;
      expect(isInternalURL(href, basePath)).toBe(false);
    });

    it('should return `false` if absolute URL contains tabs or new lines', () => {
      // These URLs can either be treated as internal or external depending on the presence of the special characters.
      const getURLsWithCharInRelativeScheme = (char: string) => [
        `/${char}${basePath}app/kibana`,
        `/${char}/${basePath}/app/kibana`,
        `/${char}${basePath}/example.com`,
        `/${char}/${basePath}/example.com`,
        `/${char}${basePath}/example.org`,
        `/${char}/${basePath}/example.org`,
        `/${char}${basePath}/example.org:5601`,
        `/${char}/${basePath}/example.org:5601`,
      ];

      // These URLs can either be treated as internal or external depending on the presence of the special characters
      // AND spaces since these affect how URL's scheme is parsed.
      const getURLsWithCharInScheme = (char: string) => [
        `htt${char}ps://example.com${basePath}`,
        `htt${char}ps://example.org${basePath}`,
        `htt${char}ps://example.org:5601${basePath}`,
        `java${char}script:${basePath}alert(1)`,
        `htt${char}p:/${basePath}/example.org:5601`,
        `file${char}:/${basePath}/example.com`,
      ];

      // These URLs should always be recognized as external irrespective to the presence of the special characters or
      // spaces since these affect URLs hostname.
      const getURLsWithCharInHost = (char: string) => [
        `//${char}${basePath}/app/kibana`,
        `//${char}/example.com${basePath}`,
        `//${char}/example.org${basePath}`,
        `//${char}/example.org:5601${basePath}`,
        `https:/${char}/example.com${basePath}`,
        // This URL is only valid if the `char` is a tab or newline character.
        `https://example${char}.com${basePath}/path`,
      ];

      // Detection logic should treat URLs as if tab and newline characters weren't present.
      for (const char of ['', '\t', '\n', '\r', '\t\n\r']) {
        for (const url of [
          ...getURLsWithCharInRelativeScheme(char),
          ...getURLsWithCharInScheme(char),
          ...getURLsWithCharInHost(char),
        ]) {
          expect(isInternalURL(url)).toBe(false);
        }
      }

      // Characters that aren't tabs, spaces, or newline characters turn absolute scheme-relative URLs to relative URLs.
      for (const char of ['1', 'a']) {
        for (const url of getURLsWithCharInRelativeScheme(char)) {
          expect(isInternalURL(url)).toBe(true);
        }

        for (const url of getURLsWithCharInScheme(char)) {
          expect(isInternalURL(url)).toBe(false);
        }

        for (const url of getURLsWithCharInHost(char)) {
          expect(isInternalURL(url)).toBe(false);
        }
      }

      // Spaces aren't allowed in scheme definition and turn absolute URLs into relative URLs.
      for (const char of [' ']) {
        for (const url of getURLsWithCharInRelativeScheme(char)) {
          expect(isInternalURL(url)).toBe(true);
        }

        for (const url of getURLsWithCharInScheme(char)) {
          expect(isInternalURL(url)).toBe(true);
        }

        for (const url of getURLsWithCharInHost(char)) {
          expect(isInternalURL(url)).toBe(false);
        }
      }
    });
  });

  describe('without basePath defined', () => {
    it('should return `true `if URL includes hash fragment', () => {
      const href = '/app/kibana#/discover/New-Saved-Search';
      expect(isInternalURL(href)).toBe(true);
    });

    it('should return `false` if URL includes a protocol/hostname', () => {
      const href = 'https://example.com/app/kibana';
      expect(isInternalURL(href)).toBe(false);
    });

    it('should return `false` if URL includes a port', () => {
      const href = 'http://localhost:5601/app/kibana';
      expect(isInternalURL(href)).toBe(false);
    });

    it('should return `false` if URL does not specify protocol', () => {
      const hrefWithTwoSlashes = `//app/kibana`;
      expect(isInternalURL(hrefWithTwoSlashes)).toBe(false);

      const hrefWithThreeSlashes = `///app/kibana`;
      expect(isInternalURL(hrefWithThreeSlashes)).toBe(false);
    });

    it('should properly handle tabs or newline characters in the URL', () => {
      // These URLs can either be treated as internal or external depending on the presence of the special characters.
      const getURLsWithCharInRelativeScheme = (char: string) => [
        `/${char}/app/kibana`,
        `/${char}//app/kibana`,
        `/${char}/example.com`,
        `/${char}//example.com`,
        `/${char}/example.org`,
        `/${char}//example.org`,
        `/${char}/example.org:5601`,
        `/${char}//example.org:5601`,
      ];

      // These URLs can either be treated as internal or external depending on the presence of the special characters
      // AND spaces since these affect how URL's scheme is parsed.
      const getURLsWithCharInScheme = (char: string) => [
        `htt${char}ps://example.com`,
        `htt${char}ps://example.org`,
        `htt${char}ps://example.org:5601`,
        `java${char}script:alert(1)`,
        `htt${char}p://example.org:5601`,
        `file${char}://example.com`,
      ];

      // These URLs should always be recognized as external irrespective to the presence of the special characters or
      // spaces since these affect URLs hostname.
      const getURLsWithCharInHost = (char: string) => [
        `//${char}/app/kibana`,
        `//${char}/example.com`,
        `//${char}/example.org`,
        `//${char}/example.org:5601`,
        `https:/${char}/example.com`,
        // This URL is only valid if the `char` is a tab or newline character.
        `https://example${char}.com/path`,
      ];

      // Detection logic should treat URLs as if tab and newline characters weren't present.
      for (const char of ['', '\t', '\n', '\r', '\t\n\r']) {
        for (const url of [
          ...getURLsWithCharInRelativeScheme(char),
          ...getURLsWithCharInScheme(char),
          ...getURLsWithCharInHost(char),
        ]) {
          expect(isInternalURL(url)).toBe(false);
        }
      }

      // Characters that aren't tabs, spaces, or newline characters turn absolute scheme-relative URLs to relative URLs.
      for (const char of ['1', 'a']) {
        for (const url of getURLsWithCharInRelativeScheme(char)) {
          expect(isInternalURL(url)).toBe(true);
        }

        for (const url of getURLsWithCharInScheme(char)) {
          expect(isInternalURL(url)).toBe(false);
        }

        for (const url of getURLsWithCharInHost(char)) {
          expect(isInternalURL(url)).toBe(false);
        }
      }

      // Spaces aren't allowed in scheme definition and turn absolute URLs into relative URLs.
      for (const char of [' ']) {
        for (const url of getURLsWithCharInRelativeScheme(char)) {
          expect(isInternalURL(url)).toBe(true);
        }

        for (const url of getURLsWithCharInScheme(char)) {
          expect(isInternalURL(url)).toBe(true);
        }

        for (const url of getURLsWithCharInHost(char)) {
          expect(isInternalURL(url)).toBe(false);
        }
      }
    });
  });
});
