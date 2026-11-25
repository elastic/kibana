/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  appendReturnParamsToHash,
  getHashQuery,
  getTutorialDirectoryAppHeaderBack,
  getTutorialDirectoryFirstCrumb,
  getTutorialIntroductionBackLink,
} from './tutorial_directory_return_crumb';

const addBasePath = (path: string) => path;
const getUrlForApp = (appId: string, { path }: { path: string }) => `/app/${appId}${path}`;

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

describe('getTutorialDirectoryAppHeaderBack', () => {
  it('names Integrations as the destination when there are no return params', () => {
    expect(
      getTutorialDirectoryAppHeaderBack({
        hash: '#/tutorial_directory/sampleData',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      label: 'Integrations',
      href: '/app/integrations/browse',
    });
  });

  it('names Selection as the destination for observability onboarding', () => {
    expect(
      getTutorialDirectoryAppHeaderBack({
        hash: '#/tutorial_directory/sampleData?returnAppId=observabilityOnboarding&returnPath=%3F',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      label: 'Selection',
      href: '/app/observabilityOnboarding?',
    });
  });

  it('names Previous page as the destination for an unknown return app', () => {
    expect(
      getTutorialDirectoryAppHeaderBack({
        hash: '#/tutorial_directory/sampleData?returnAppId=otherApp&returnPath=%2Ffoo',
        addBasePath,
        getUrlForApp,
      })
    ).toEqual({
      label: 'Previous page',
      href: '/app/otherApp/foo',
    });
  });
});

describe('Home return params', () => {
  const homeHash = '#/tutorial_directory/sampleData?returnAppId=home&returnPath=%23%2F';

  it('names Home in the first crumb', () => {
    expect(getTutorialDirectoryFirstCrumb({ hash: homeHash, addBasePath, getUrlForApp })).toEqual({
      text: 'Home',
      href: '/app/home#/',
    });
  });

  it('names Home as the app header back destination', () => {
    expect(
      getTutorialDirectoryAppHeaderBack({ hash: homeHash, addBasePath, getUrlForApp })
    ).toEqual({ label: 'Home', href: '/app/home#/' });
  });

  it('names Back to Home in the tutorial introduction back link', () => {
    expect(getTutorialIntroductionBackLink({ hash: homeHash, addBasePath, getUrlForApp })).toEqual({
      text: 'Back to Home',
      href: '/app/home#/',
    });
  });

  it('appends return params and keeps them readable via getHashQuery', () => {
    const hash = appendReturnParamsToHash('#/tutorial_directory/sampleData', {
      returnAppId: 'home',
      returnPath: '#/',
    });
    expect(hash).toBe(homeHash);
    expect(getHashQuery(hash)).toBe('?returnAppId=home&returnPath=%23%2F');
    expect(getHashQuery('#/tutorial_directory/sampleData')).toBe('');
  });
});

describe('Search getting started return params', () => {
  const hash = '#/tutorial_directory/sampleData?returnAppId=searchGettingStarted&returnPath=%2F';

  it('names Getting started as the back destination', () => {
    expect(getTutorialDirectoryAppHeaderBack({ hash, addBasePath, getUrlForApp })).toEqual({
      label: 'Getting started',
      href: '/app/searchGettingStarted/',
    });
  });
});
