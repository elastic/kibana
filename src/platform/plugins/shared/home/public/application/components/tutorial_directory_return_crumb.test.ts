/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTutorialDirectoryFirstCrumb } from './tutorial_directory_return_crumb';

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
