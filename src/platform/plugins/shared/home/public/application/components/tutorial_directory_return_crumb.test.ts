/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getTutorialDirectoryFirstCrumb,
  getTutorialIntroductionBackLink,
  readReturnParamsFromHash,
} from './tutorial_directory_return_crumb';

const addBasePath = (path: string) => path;
const getUrlForApp = (appId: string, { path }: { path: string }) => `/app/${appId}${path}`;

describe('readReturnParamsFromHash', () => {
  it('reads params after the hash path', () => {
    expect(
      readReturnParamsFromHash(
        '#/tutorial_directory/fileDataViz?returnAppId=observabilityOnboarding&returnPath=%3F'
      )
    ).toEqual({
      returnAppId: 'observabilityOnboarding',
      returnPath: '?',
    });
  });

  it('returns undefined when the hash has no query', () => {
    expect(readReturnParamsFromHash('#/tutorial_directory/fileDataViz')).toBeUndefined();
  });

  it('returns undefined when only one param is present', () => {
    expect(
      readReturnParamsFromHash(
        '#/tutorial_directory/fileDataViz?returnAppId=observabilityOnboarding'
      )
    ).toBeUndefined();
  });
});

describe('getTutorialDirectoryFirstCrumb', () => {
  it('returns the Integrations crumb when the hash has no return params', () => {
    expect(
      getTutorialDirectoryFirstCrumb({
        hash: '#/tutorial_directory/fileDataViz',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      text: 'Integrations',
      href: '/app/integrations/browse',
    });
  });

  it('returns Add data when returnAppId is observabilityOnboarding', () => {
    expect(
      getTutorialDirectoryFirstCrumb({
        hash: '#/tutorial_directory/fileDataViz?returnAppId=observabilityOnboarding&returnPath=%3F',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      text: 'Add data',
      href: '/app/observabilityOnboarding?',
    });
  });

  it('returns Previous page for an unknown returnAppId', () => {
    expect(
      getTutorialDirectoryFirstCrumb({
        hash: '#/tutorial_directory/fileDataViz?returnAppId=otherApp&returnPath=%2Ffoo',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      text: 'Previous page',
      href: '/app/otherApp/foo',
    });
  });
});

describe('getTutorialIntroductionBackLink', () => {
  it('returns the integrations href and no text when the hash has no return params', () => {
    expect(
      getTutorialIntroductionBackLink({
        hash: '#/tutorial/apm',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      href: '/app/integrations',
    });
  });

  it('returns Back to selection when returnAppId is observabilityOnboarding', () => {
    expect(
      getTutorialIntroductionBackLink({
        hash: '#/tutorial/apm?returnAppId=observabilityOnboarding&returnPath=%3F',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      text: 'Back to selection',
      href: '/app/observabilityOnboarding?',
    });
  });

  it('ignores an unknown returnAppId so the chevron is not retargeted', () => {
    expect(
      getTutorialIntroductionBackLink({
        hash: '#/tutorial/apm?returnAppId=otherApp&returnPath=%2Ffoo',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      href: '/app/integrations',
    });
  });
});
