/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test/jest';

import { Main } from '../../../public/application/containers';
import { WithAppDependencies } from '../helpers';

jest.mock('../../../public/application/models/legacy_core_editor/mode/worker/index.js', () => ({
  id: 'sense_editor/mode/worker',
  src: {},
}));

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/`],
    componentRoutePath: '/',
  },
  doMountAsync: true,
};

export type AppTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const clickSendRequestButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('sendRequestButton').simulate('click');
    });

    component.update();
  };

  return {
    clickSendRequestButton,
  };
};

export const setupAppPage = async (overrides?: Record<string, unknown>): Promise<AppTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(Main, overrides), testBedConfig);
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
