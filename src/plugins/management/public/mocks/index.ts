/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ManagementSetup, ManagementStart, DefinedSections } from '../types';
import { ManagementSection } from '../index';

export const createManagementSectionMock = () =>
  (({
    disable: jest.fn(),
    enable: jest.fn(),
    registerApp: jest.fn(),
    getApp: jest.fn(),
    getEnabledItems: jest.fn().mockReturnValue([]),
  } as unknown) as ManagementSection);

const createSetupContract = (): ManagementSetup => ({
  sections: {
    register: jest.fn(() => createManagementSectionMock()),
    section: ({
      ingest: createManagementSectionMock(),
      data: createManagementSectionMock(),
      insightsAndAlerting: createManagementSectionMock(),
      security: createManagementSectionMock(),
      kibana: createManagementSectionMock(),
      stack: createManagementSectionMock(),
    } as unknown) as DefinedSections,
  },
});

const createStartContract = (): ManagementStart => ({
  sections: {},
});

export const managementPluginMock = {
  createSetupContract,
  createStartContract,
};
