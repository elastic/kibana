/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Services, KibanaDependencies } from '../src/types';

export const getProjectSwitcherServicesMock: () => jest.Mocked<Services> = () => ({
  setProjectType: jest.fn(),
});

export const getProjectSwitcherKibanaDependenciesMock: () => jest.Mocked<KibanaDependencies> =
  () => ({
    coreStart: {
      http: {
        post: jest.fn(() => Promise.resolve({ data: {} })),
      },
    },
    projectChangeAPIUrl: 'serverless/change_project',
  });
