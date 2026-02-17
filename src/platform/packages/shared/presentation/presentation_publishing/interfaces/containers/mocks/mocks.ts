/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PresentationContainer } from '../presentation_container';
export const getMockPresentationContainer = (): PresentationContainer => {
  return {
    removePanel: jest.fn(),
    addNewPanel: jest.fn(),
    replacePanel: jest.fn(),
    getChildApi: jest.fn(),
    getPanelCount: jest.fn(),
    children$: new BehaviorSubject<{ [key: string]: unknown }>({}),
  };
};
