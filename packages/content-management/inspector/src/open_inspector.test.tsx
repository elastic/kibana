/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { registerTestBed } from '@kbn/test-jest-helpers';
import { WithServices, getMockServices } from './__jest__';
import type { Services } from './services';
import { InspectorLoader } from './components';
import { useOpenInspector } from './open_inspector';

describe('useOpenInspector() hook', () => {
  const savedObjectItem = { title: 'Foo', tags: [] };

  const TestComp = () => {
    const openInspector = useOpenInspector();
    return (
      <button
        onClick={() => {
          openInspector({ item: savedObjectItem, entityName: 'Foo' });
        }}
        data-test-subj="openInspectorButton"
      >
        Open inspector
      </button>
    );
  };

  const mockedServices = getMockServices();
  const openFlyout = mockedServices.openFlyout as jest.MockedFunction<Services['openFlyout']>;

  const setup = registerTestBed(WithServices(TestComp, mockedServices), {
    memoryRouter: { wrapComponent: false },
  });

  test('should call the "openFlyout" provided', () => {
    const { find } = setup();

    find('openInspectorButton').simulate('click');

    expect(openFlyout).toHaveBeenCalled();
    const args = openFlyout.mock.calls[0][0] as any;
    expect(args?.type).toBe(InspectorLoader);
    expect(args?.props.item).toBe(savedObjectItem);
    expect(args?.props.services).toEqual(mockedServices);
  });
});
