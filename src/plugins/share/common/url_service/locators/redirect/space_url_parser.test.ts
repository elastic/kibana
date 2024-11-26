/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addSpaceIdToPath } from './space_url_parser';

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

  test('it replaces existing space identifiers', () => {
    expect(addSpaceIdToPath('/my/base/path/s/old-space/', 'new-space')).toEqual(
      '/my/base/path/s/new-space'
    );

    expect(addSpaceIdToPath('/my/base/path/s/old-space', 'new-space')).toEqual(
      '/my/base/path/s/new-space'
    );

    expect(addSpaceIdToPath('/my/base/path/s/old-space', 'default')).toEqual('/my/base/path');
  });

  test('it throws an error when the requested path does not start with a slash', () => {
    expect(() => {
      addSpaceIdToPath('', '', 'foo');
    }).toThrowErrorMatchingInlineSnapshot(`"path must start with a /"`);
  });
});
