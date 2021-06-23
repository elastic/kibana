/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from './test_utils';

export const getCommonActions = (testBed: TestBed) => {
  const toggleFormRow = (row: 'customLabel' | 'value' | 'format', value: 'on' | 'off' = 'on') => {
    const testSubj = `${row}Row.toggle`;
    const toggle = testBed.find(testSubj);
    const isOn = toggle.props()['aria-checked'];

    if ((value === 'on' && isOn) || (value === 'off' && isOn === false)) {
      return;
    }

    testBed.form.toggleEuiSwitch(testSubj);
  };

  const changeFieldType = async (value: string, label?: string) => {
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

  return {
    toggleFormRow,
    changeFieldType,
  };
};
