/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import { Filter } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';

export const controlGroupFilterOutputMock$ = new BehaviorSubject<Filter[] | undefined>([]);
export const controlGroupFilterStateMock$ = new BehaviorSubject<ControlGroupRuntimeState>({
  initialChildControlState: {},
} as unknown as ControlGroupRuntimeState);
export const getInput$Mock = jest.fn(() => controlGroupFilterStateMock$);

export const getControlGroupMock = () => {
  return {
    reload: jest.fn(),
    updateInput: jest.fn(),
    getInput$: getInput$Mock,
    openAddDataControlFlyout: jest.fn(),
    filters$: controlGroupFilterOutputMock$,
    setChainingSystem: jest.fn(),
    snapshotRuntimeState: jest.fn(),
  };
};
