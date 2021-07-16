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
  };

  const updateScript = async (value: string) => {
    await act(async () => {
      testBed.form.setInputValue('scriptField', value);
    });
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

  // The preview updates on a debounce of 500ms whenever
  // a parameter changes (script, type)
  const waitForPreviewUpdate = async () => {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    testBed.component.update();
  };

  return {
    toggleFormRow,
    waitForPreviewUpdate,
    fields: {
      updateName,
      updateType,
      updateScript,
    },
  };
};
