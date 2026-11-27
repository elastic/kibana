/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getHashQuery,
  getTutorialDirectoryAppHeaderBack,
  getTutorialDirectoryFirstCrumb,
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

describe('registered app titles', () => {
  const titles: Record<string, string> = {
    home: 'Home',
    searchHomepage: 'Home',
    searchGettingStarted: 'Getting started',
  };
  const getAppTitle = (appId: string) => titles[appId];

  it.each([
    ['home', '%23%2F', 'Home', '/app/home#/'],
    ['searchHomepage', '%2F', 'Home', '/app/searchHomepage/'],
    ['searchGettingStarted', '%2F', 'Getting started', '/app/searchGettingStarted/'],
  ])('names %s by its registered title', (appId, returnPath, label, href) => {
    const hash = `#/tutorial_directory/sampleData?returnAppId=${appId}&returnPath=${returnPath}`;
    expect(
      getTutorialDirectoryFirstCrumb({ hash, addBasePath, getUrlForApp, getAppTitle })
    ).toEqual({ text: label, href });
    expect(
      getTutorialDirectoryAppHeaderBack({ hash, addBasePath, getUrlForApp, getAppTitle })
    ).toEqual({ label, href });
  });

  it('keeps the special label for observability onboarding', () => {
    expect(
      getTutorialDirectoryFirstCrumb({
        hash: '#/tutorial_directory/sampleData?returnAppId=observabilityOnboarding&returnPath=%3F',
        addBasePath,
        getUrlForApp,
        getAppTitle,
      }).text
    ).toBe('Add data');
  });

  it('falls back to Previous page when the app has no registered title', () => {
    expect(
      getTutorialDirectoryFirstCrumb({
        hash: '#/tutorial_directory/sampleData?returnAppId=otherApp&returnPath=%2Ffoo',
        addBasePath,
        getUrlForApp,
        getAppTitle,
      }).text
    ).toBe('Previous page');
  });
});

describe('getHashQuery', () => {
  it('returns the query string with the leading ?', () => {
    expect(getHashQuery('#/tutorial_directory/sampleData?returnAppId=home&returnPath=%23%2F')).toBe(
      '?returnAppId=home&returnPath=%23%2F'
    );
    expect(getHashQuery('#/tutorial_directory/sampleData')).toBe('');
  });
});
