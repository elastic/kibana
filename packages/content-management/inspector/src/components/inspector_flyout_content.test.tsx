/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed } from '@kbn/test-jest-helpers';
import type { TestBed } from '@kbn/test-jest-helpers';
import { WithServices, getMockServices } from '../__jest__';
import type { Services } from '../services';
import { InspectorFlyoutContent } from './inspector_flyout_content';
import type { Props as InspectorFlyoutContentProps } from './inspector_flyout_content';

describe('<InspectorFlyoutContent />', () => {
  describe('metadata', () => {
    let testBed: TestBed;

    const savedObjectItem: InspectorFlyoutContentProps['item'] = {
      title: 'Foo',
      description: 'Some description',
      tags: ['tag-1', 'tag-2'],
    };

    const mockedServices = getMockServices();

    const defaultProps = {
      item: savedObjectItem,
      services: mockedServices,
      onCancel: jest.fn(),
    };

    const setup = registerTestBed<string, InspectorFlyoutContentProps>(InspectorFlyoutContent, {
      memoryRouter: { wrapComponent: false },
      defaultProps,
    });

    test('should render the form with the provided item', async () => {
      await act(async () => {
        testBed = await setup();
      });
      const { find } = testBed!;

      expect(find('metadataForm.nameInput').props().value).toBe(savedObjectItem.title);
      expect(find('metadataForm.descriptionInput').props().value).toBe(savedObjectItem.description);
    });

    test('should be in readOnly mode by default', async () => {
      await act(async () => {
        testBed = await setup();
      });
      const { find, exists } = testBed!;

      expect(find('metadataForm.nameInput').props().readOnly).toBe(true);
      expect(find('metadataForm.descriptionInput').props().readOnly).toBe(true);
      expect(exists('saveButton')).toBe(false);
    });

    test('should send back the updated item to the onSave() handler', async () => {
      const onSave = jest.fn();

      await act(async () => {
        testBed = await setup({ onSave, isReadonly: false });
      });
      const {
        find,
        component,
        form: { setInputValue },
      } = testBed!;

      await act(async () => {
        find('saveButton').simulate('click');
      });

      expect(onSave).toHaveBeenCalledWith({
        title: 'Foo',
        description: 'Some description',
        tags: ['tag-1', 'tag-2'],
      });

      await act(async () => {
        setInputValue('metadataForm.nameInput', 'newTitle');
        setInputValue('metadataForm.descriptionInput', 'newDescription');
      });

      component.update();

      await act(async () => {
        find('saveButton').simulate('click');
      });

      expect(onSave).toHaveBeenCalledWith({
        title: 'newTitle',
        description: 'newDescription',
        tags: ['tag-1', 'tag-2'],
      });
    });
  });
});
