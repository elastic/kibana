/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test/jest';

export const getCommonActions = (testBed: TestBed) => {
  const toggleFormRow = async (
    row: 'customLabel' | 'value' | 'format',
    value: 'on' | 'off' = 'on'
  ) => {
    const testSubj = `${row}Row.toggle`;
    const toggle = testBed.find(testSubj);
    const isOn = toggle.props()['aria-checked'];

    if ((value === 'on' && isOn) || (value === 'off' && isOn === false)) {
      return;
    }

    await act(async () => {
      testBed.form.toggleEuiSwitch(testSubj);
    });

    testBed.component.update();
  };

  // Fields
  const updateName = async (value: string) => {
    await act(async () => {
      testBed.form.setInputValue('nameField.input', value);
    });

    testBed.component.update();
  };

  const updateScript = async (value: string) => {
    await act(async () => {
      testBed.form.setInputValue('scriptField', value);
    });

    testBed.component.update();
  };

  const updateType = async (value: string, label?: string) => {
    await act(async () => {
      testBed.find('typeField').simulate('change', [
        {
          value,
          label: label ?? value,
        },
      ]);
    });

    testBed.component.update();
  };

  const updateFormat = async (value: string, label?: string) => {
    await act(async () => {
      testBed.find('editorSelectedFormatId').simulate('change', { target: { value } });
    });

    testBed.component.update();
  };

  /**
   * Allows us to bypass the debounce time of 500ms before updating the preview. We also simulate
   * a 2000ms latency when searching ES documents (see setup_environment.tsx).
   */
  const waitForUpdates = async () => {
    await act(async () => {
      jest.runAllTimers();
    });

    testBed.component.update();
  };

  /**
   * When often need to both wait for the documents to be fetched and
   * the preview to be fetched. We can't increase the `jest.advanceTimersByTime` time
   * as those are 2 different operations that occur in sequence.
   */
  const waitForDocumentsAndPreviewUpdate = async () => {
    // Wait for documents to be fetched
    await act(async () => {
      jest.runAllTimers();
    });

    // Wait for preview to update
    await act(async () => {
      jest.runAllTimers();
    });

    testBed.component.update();
  };

  return {
    toggleFormRow,
    waitForUpdates,
    waitForDocumentsAndPreviewUpdate,
    fields: {
      updateName,
      updateType,
      updateScript,
      updateFormat,
    },
  };
};
