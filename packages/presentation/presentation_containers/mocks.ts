/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { PresentationContainer } from './interfaces/presentation_container';

export const getMockPresentationContainer = (): PresentationContainer => {
  return {
    removePanel: jest.fn(),
    addNewPanel: jest.fn(),
    replacePanel: jest.fn(),
    registerPanelApi: jest.fn(),
    lastSavedState: new Subject<void>(),
    getLastSavedStateForChild: jest.fn(),
    getChildIds: jest.fn(),
    getChild: jest.fn(),
  };
};
