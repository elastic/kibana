/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  addSolutionIdToPath,
  getSolutionIdFromPath,
  stripSolutionIdFromPath,
} from './solutions_url_parser';

describe('getSolutionIdFromPath', () => {
  describe('without a serverBasePath defined', () => {
    test('it identifies the solution url context', () => {
      const basePath = `/n/observability`;
      expect(getSolutionIdFromPath(basePath)).toEqual({
        solutionId: 'observability',
        pathHasExplicitSolutionIdentifier: true,
      });
    });

    test('it identifies the solution url context after other known base paths', () => {
      const basePath = `/s/some-space/n/observability/app/foo`;
      expect(getSolutionIdFromPath(basePath)).toEqual({
        solutionId: 'observability',
        pathHasExplicitSolutionIdentifier: true,
      });
    });

    test('ignores solution identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/n/observability`;
      expect(getSolutionIdFromPath(basePath)).toEqual({
        solutionId: null,
        pathHasExplicitSolutionIdentifier: false,
      });
    });

    test('it handles base url without a solution url context', () => {
      const basePath = `/this/is/a/crazy/path/n`;
      expect(getSolutionIdFromPath(basePath)).toEqual({
        solutionId: null,
        pathHasExplicitSolutionIdentifier: false,
      });
    });
  });

  describe('with a serverBasePath defined', () => {
    test('it identifies the solution url context', () => {
      const basePath = `/n/observability`;
      expect(getSolutionIdFromPath(basePath, '/')).toEqual({
        solutionId: 'observability',
        pathHasExplicitSolutionIdentifier: true,
      });
    });

    test('it identifies the solution url context following the server base path', () => {
      const basePath = `/server-base-path-here/n/observability`;
      expect(getSolutionIdFromPath(basePath, '/server-base-path-here')).toEqual({
        solutionId: 'observability',
        pathHasExplicitSolutionIdentifier: true,
      });
    });

    test('ignores solution identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/n/observability`;
      expect(getSolutionIdFromPath(basePath, '/this/is/a')).toEqual({
        solutionId: null,
        pathHasExplicitSolutionIdentifier: false,
      });
    });
  });
});

describe('addSolutionIdToPath', () => {
  test('handles no parameters', () => {
    expect(addSolutionIdToPath()).toEqual(`/`);
  });

  test('it adds to the basePath correctly', () => {
    expect(addSolutionIdToPath('/my/base/path', 'url-context')).toEqual(
      '/my/base/path/n/url-context'
    );
  });

  test('it appends the requested path to the end of the url context', () => {
    expect(addSolutionIdToPath('/base', 'context', '/final/destination')).toEqual(
      '/base/n/context/final/destination'
    );
  });

  test('it removes previous solution url context before adding the next one', () => {
    expect(
      addSolutionIdToPath('/base/n/previouscontext', 'nextcontext', '/final/destination')
    ).toEqual('/base/n/nextcontext/final/destination');
  });

  test('it throws an error when the requested path does not start with a slash', () => {
    expect(() => {
      addSolutionIdToPath('', '', 'foo');
    }).toThrowErrorMatchingInlineSnapshot(`"path must start with a /"`);
  });
});

describe('stripSolutionIdFromPath', () => {
  test('it removes basePath correctly', () => {
    expect(stripSolutionIdFromPath('/n/oblt/s/my-space/app')).toEqual('/s/my-space/app');
  });

  test('it does not remove in the middle of the path', () => {
    expect(stripSolutionIdFromPath('/app/n/foo')).toEqual('/app/n/foo');
  });

  test('it preserves other known basePaths', () => {
    expect(stripSolutionIdFromPath('/s/my-space/n/observability/app')).toEqual('/s/my-space/app');
  });
});
