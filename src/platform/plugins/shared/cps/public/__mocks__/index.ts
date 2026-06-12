/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, of } from 'rxjs';
import { PROJECT_ROUTING, ProjectRoutingAccess, type ICPSManager } from '@kbn/cps-utils';

export const createCpsManagerMock = (): jest.Mocked<ICPSManager> => ({
  whenReady: jest.fn().mockResolvedValue(undefined),
  fetchProjects: jest.fn().mockResolvedValue(null),
  getTotalProjectCount: jest.fn().mockReturnValue(1),
  getProjectRouting$: jest.fn(() => of(undefined)),
  setProjectRouting: jest.fn(),
  getProjectRouting: jest.fn(() => undefined),
  getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
  updateDefaultProjectRouting: jest.fn(),
  getProjectPickerAccess$: jest.fn(() => of(ProjectRoutingAccess.DISABLED)),
  registerAppAccess: jest.fn(),
});

let mockProjectRoutingSubject: BehaviorSubject<string | undefined> | undefined;

export const cpsServiceMock = {
  cpsManager: {
    ...createCpsManagerMock(),
    getProjectRouting: jest.fn(() => undefined),
    setProjectRouting: jest.fn((value: string | undefined) => {
      if (!mockProjectRoutingSubject) {
        mockProjectRoutingSubject = new BehaviorSubject<string | undefined>(value);
      } else {
        mockProjectRoutingSubject.next(value);
      }
    }),
    getDefaultProjectRouting: jest.fn(() => undefined),
    getProjectRouting$: jest.fn(() => {
      if (!mockProjectRoutingSubject) {
        mockProjectRoutingSubject = new BehaviorSubject<string | undefined>(undefined);
      }
      return mockProjectRoutingSubject;
    }),
    registerAppAccess: jest.fn(),
  },
};

export const resetCpsMock = () => {
  mockProjectRoutingSubject = undefined;
  jest.clearAllMocks();
};
