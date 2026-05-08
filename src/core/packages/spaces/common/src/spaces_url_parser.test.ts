/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addSpaceIdToPath, getSpaceIdFromPath } from './spaces_url_parser';
import { DEFAULT_SPACE_ID } from './space_id';

describe('getSpaceIdFromPath', () => {
  describe('without a serverBasePath defined', () => {
    test('extracts spaceId and strips the space prefix from the path', () => {
      expect(getSpaceIdFromPath('/s/my-space/app/foo')).toEqual({
        spaceId: 'my-space',
        pathname: '/app/foo',
      });
    });

    test('returns DEFAULT_SPACE_ID and unchanged path when no /s/ prefix', () => {
      expect(getSpaceIdFromPath('/app/foo')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '/app/foo',
      });
    });

    test('ignores /s/<id> in the middle of the path', () => {
      expect(getSpaceIdFromPath('/this/is/a/crazy/path/s/my-space')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '/this/is/a/crazy/path/s/my-space',
      });
    });

    test('handles path ending in /s without a space id', () => {
      expect(getSpaceIdFromPath('/this/is/a/crazy/path/s')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '/this/is/a/crazy/path/s',
      });
    });

    test('returns "/" pathname when path is only the space prefix', () => {
      expect(getSpaceIdFromPath('/s/my-space')).toEqual({
        spaceId: 'my-space',
        pathname: '/',
      });
    });

    test('handles the default space explicitly', () => {
      expect(getSpaceIdFromPath(`/s/${DEFAULT_SPACE_ID}`)).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '/',
      });
    });
  });

  describe('with a serverBasePath defined', () => {
    test('strips serverBasePath before extracting spaceId', () => {
      expect(getSpaceIdFromPath('/server/s/my-space/app/foo', '/server')).toEqual({
        spaceId: 'my-space',
        pathname: '/app/foo',
      });
    });

    test('returns DEFAULT_SPACE_ID when no space prefix after serverBasePath', () => {
      expect(getSpaceIdFromPath('/server/app/foo', '/server')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '/app/foo',
      });
    });

    test('ignores /s/<id> in the middle after serverBasePath strip', () => {
      expect(getSpaceIdFromPath('/this/is/a/crazy/path/s/my-space', '/this/is/a')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '/crazy/path/s/my-space',
      });
    });

    test('handles path equal to serverBasePath', () => {
      expect(getSpaceIdFromPath('/this/is/a/crazy/path/s', '/this/is/a/crazy/path/s')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathname: '',
      });
    });
  });
});

describe('addSpaceIdToPath', () => {
  test('handles no parameters', () => {
    expect(addSpaceIdToPath()).toEqual(`/`);
  });

  test('it adds to the basePath correctly', () => {
    expect(addSpaceIdToPath('/my/base/path', 'url-context')).toEqual('/my/base/path/s/url-context');
  });

  test('it appends the requested path to the end of the url context', () => {
    expect(addSpaceIdToPath('/base', 'context', '/final/destination')).toEqual(
      '/base/s/context/final/destination'
    );
  });

  test('it throws an error when the requested path does not start with a slash', () => {
    expect(() => {
      addSpaceIdToPath('', '', 'foo');
    }).toThrowErrorMatchingInlineSnapshot(`"path must start with a /"`);
  });
});
