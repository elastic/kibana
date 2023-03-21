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
import type { Item } from './types';
import { ContentEditorLoader } from './components';
import { useOpenContentEditor } from './open_content_editor';

describe('useOpenContentEditor() hook', () => {
  const savedObjectItem: Item = { id: 'id', title: 'Foo', tags: [] };

  const TestComp = () => {
    const openContentEditor = useOpenContentEditor();
    return (
      <button
        onClick={() => {
          openContentEditor({ item: savedObjectItem, entityName: 'Foo' });
        }}
        data-test-subj="openContentEditorButton"
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

    find('openContentEditorButton').simulate('click');

    expect(openFlyout).toHaveBeenCalled();
    const args = openFlyout.mock.calls[0][0] as any;
    expect(args?.type).toBe(ContentEditorLoader);
    expect(args?.props.item).toBe(savedObjectItem);
    expect(args?.props.services).toEqual(mockedServices);
  });
});
