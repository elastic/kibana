/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlGroupOutput, ControlGroupInput } from '@kbn/controls-plugin/public';
import { Subject } from 'rxjs';

export const controlGroupFilterOutputMock$ = new Subject<ControlGroupOutput>();

export const controlGroupFilterInputMock$ = new Subject<ControlGroupInput>();

export const getInput$Mock = jest.fn(() => controlGroupFilterInputMock$);

export const getOutput$Mock = jest.fn(() => controlGroupFilterOutputMock$);

export const getControlGroupMock = () => {
  return {
    reload: jest.fn(),
    getInput: jest.fn().mockReturnValue({
      viewMode: 'VIEW',
    }),
    updateInput: jest.fn(),
    getOutput$: getOutput$Mock,
    getInput$: getInput$Mock,
    openAddDataControlFlyout: jest.fn(),
    addOptionsListControl: jest.fn(),
  };
};
