/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';

/**
 * We often need to wait for both the documents & the preview to be fetched.
 * We can't increase the `jest.advanceTimersByTime()` time
 * as those are 2 different operations that occur in sequence.
 */
export const waitForDocumentsAndPreviewUpdate = async (testBed?: TestBed) => {
  // Wait for documents to be fetched
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  // Wait for the syntax validation debounced
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  testBed?.component.update();
};

/**
 * Handler to bypass the debounce time in our tests
 */
export const waitForUpdates = async (testBed?: TestBed) => {
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  testBed?.component.update();
};

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

  const getScriptError = () => {
    const scriptError = testBed.component.find('#runtimeFieldScript-error-0');

    if (scriptError.length === 0) {
      return null;
    } else if (scriptError.length > 1) {
      return scriptError.at(0).text();
    }

    return scriptError.text();
  };

  return {
    toggleFormRow,
    waitForUpdates: waitForUpdates.bind(null, testBed),
    waitForDocumentsAndPreviewUpdate: waitForDocumentsAndPreviewUpdate.bind(null, testBed),
    fields: {
      updateName,
      updateType,
      updateScript,
      updateFormat,
      getScriptError,
    },
  };
};
