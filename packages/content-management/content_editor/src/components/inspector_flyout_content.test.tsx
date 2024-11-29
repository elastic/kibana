/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { registerTestBed } from '@kbn/test-jest-helpers';
import type { TestBed } from '@kbn/test-jest-helpers';
import { getMockServices } from '../__jest__';
import { ContentEditorFlyoutContent } from './editor_flyout_content';
import type { Props as ContentEditorFlyoutContentProps } from './editor_flyout_content';

describe('<ContentEditorFlyoutContent />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('metadata', () => {
    let testBed: TestBed;

    const savedObjectItem: ContentEditorFlyoutContentProps['item'] = {
      id: '123',
      title: 'Foo',
      description: 'Some description',
      tags: [
        { id: 'id-1', name: 'tag1', type: 'tag' },
        { id: 'id-2', name: 'tag2', type: 'tag' },
      ],
    };

    const mockedServices = getMockServices();

    const defaultProps: ContentEditorFlyoutContentProps = {
      item: savedObjectItem,
      entityName: 'foo',
      services: mockedServices,
      onCancel: jest.fn(),
    };

    const setup = registerTestBed<string, ContentEditorFlyoutContentProps>(
      ContentEditorFlyoutContent,
      {
        memoryRouter: { wrapComponent: false },
        defaultProps,
      }
    );

    const waitForValidationResults = async () => {
      await act(async () => {
        jest.advanceTimersByTime(550); // There is a 500ms delay to display input errors + async validation
      });
    };

    test('should set the correct flyout title', async () => {
      await act(async () => {
        testBed = await setup();
      });
      const { find } = testBed!;
      expect(find('flyoutTitle').text()).toBe('Foo details');
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

      // Show tag list and *not* the tag selector
      expect(exists('tagList')).toBe(true);
      expect(exists('tagSelector')).toBe(false);
    });

    test('should display the "Update" button when not readOnly', async () => {
      await act(async () => {
        testBed = await setup({ isReadonly: false });
      });

      const { find } = testBed!;

      expect(find('saveButton').text()).toBe('Update foo');
    });

    test('should save form only if something changes', async () => {
      const onSave = jest.fn();

      await act(async () => {
        testBed = await setup({ onSave, isReadonly: false });
      });

      const { find, component } = testBed!;

      await act(async () => {
        find('saveButton').simulate('click');
      });

      component.update();

      expect(onSave).not.toHaveBeenCalled();
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
        setInputValue('metadataForm.nameInput', 'newTitle');
        setInputValue('metadataForm.descriptionInput', 'newDescription');
      });

      await waitForValidationResults();

      component.update();

      await act(async () => {
        find('saveButton').simulate('click');
      });

      component.update();

      expect(onSave).toHaveBeenCalledWith({
        id: '123',
        title: 'newTitle',
        description: 'newDescription',
        tags: ['id-1', 'id-2'],
      });
    });

    test('should validate that the form is valid', async () => {
      const onSave = jest.fn();

      await act(async () => {
        testBed = await setup({ onSave, isReadonly: false });
      });

      const {
        find,
        component,
        form: { setInputValue, getErrorsMessages },
      } = testBed!;

      await act(async () => {
        setInputValue('metadataForm.nameInput', ''); // empty is not allowed
      });

      await waitForValidationResults();

      component.update();

      await act(async () => {
        find('saveButton').simulate('click');
      });
      component.update();
      expect(onSave).not.toHaveBeenCalled();

      expect(getErrorsMessages()).toEqual(['A name is required.']);
      const errorCallout = component.find('.euiForm__errors').at(0);
      expect(errorCallout.text()).toContain('Please address the highlighted errors.');
      expect(errorCallout.text()).toContain('A name is required.');
    });

    test('should notify saving errors', async () => {
      const notifyError = jest.fn();
      const onSave = async () => {
        throw new Error('Houston we got a problem');
      };

      await act(async () => {
        testBed = await setup({ onSave, isReadonly: false, services: { notifyError } });
      });

      const {
        find,
        component,
        form: { setInputValue },
      } = testBed!;

      await act(async () => {
        setInputValue('metadataForm.nameInput', 'changingTitleToUnblockDisabledButtonState');
      });

      await waitForValidationResults();

      component.update();

      await act(async () => {
        find('saveButton').simulate('click');
      });

      expect(notifyError).toHaveBeenCalledWith(
        <FormattedMessage
          defaultMessage="Unable to save {entityName}"
          id="contentManagement.inspector.metadataForm.unableToSaveDangerMessage"
          values={{ entityName: 'foo' }}
        />,
        'Houston we got a problem'
      );
    });

    test('should update the tag selection', async () => {
      const onSave = jest.fn();

      await act(async () => {
        testBed = await setup({ onSave, isReadonly: false });
      });
      const { find, component } = testBed!;

      await act(async () => {
        find('tagSelector.tag-id-1').simulate('click');
        find('tagSelector.tag-id-2').simulate('click');
      });

      await waitForValidationResults();

      component.update();

      await act(async () => {
        find('saveButton').simulate('click');
      });

      const lastArgs = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(lastArgs).toEqual({
        id: '123',
        title: 'Foo',
        description: 'Some description',
        tags: [], // No more tags selected
      });

      await act(async () => {
        find('tagSelector.tag-id-3').simulate('click');
        find('tagSelector.tag-id-4').simulate('click');
      });

      await waitForValidationResults();

      component.update();

      await act(async () => {
        find('saveButton').simulate('click');
      });

      expect(onSave).toHaveBeenCalledWith({
        id: '123',
        title: 'Foo',
        description: 'Some description',
        tags: ['id-3', 'id-4'], // New selection
      });
    });
  });
});
