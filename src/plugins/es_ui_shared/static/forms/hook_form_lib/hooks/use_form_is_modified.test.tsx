/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed } from '../shared_imports';
import { useForm } from './use_form';
import { useFormIsModified } from './use_form_is_modified';
import { Form } from '../components/form';
import { UseField } from '../components/use_field';

describe('useFormIsModified()', () => {
  interface Props {
    onIsModifiedChange: (isModified: boolean) => void;
    discard?: string[];
  }

  const TestComp = ({ onIsModifiedChange, discard = [] }: Props) => {
    const { form } = useForm();
    const isModified = useFormIsModified({ form, discard });
    const [isNameVisible, setIsNameVisible] = useState(true);

    // Call our jest.spy() with the latest hook value
    onIsModifiedChange(isModified);

    return (
      <Form form={form}>
        {isNameVisible && (
          <UseField path="name" defaultValue="initialValue" data-test-subj="nameField" />
        )}
        <UseField path="toDiscard" defaultValue="initialValue" data-test-subj="toDiscardField" />
        <button data-test-subj="hideNameButton" onClick={() => setIsNameVisible(false)}>
          Hide name
        </button>
      </Form>
    );
  };

  const onIsModifiedChange = jest.fn();
  const lastValue = () =>
    onIsModifiedChange.mock.calls[onIsModifiedChange.mock.calls.length - 1][0];

  const setup = registerTestBed(TestComp, {
    defaultProps: { onIsModifiedChange },
    memoryRouter: { wrapComponent: false },
  });

  test('should return true **only** when the field value differs from its initial value', async () => {
    const { form } = await setup();

    expect(lastValue()).toBe(false);

    await act(async () => {
      form.setInputValue('nameField', 'changed');
    });

    expect(lastValue()).toBe(true);

    // Put back to the initial value --> isModified should be false
    await act(async () => {
      form.setInputValue('nameField', 'initialValue');
    });
    expect(lastValue()).toBe(false);
  });

  test('should accepts a list of field to discard', async () => {
    const { form } = await setup({ discard: ['toDiscard'] });

    expect(lastValue()).toBe(false);

    await act(async () => {
      form.setInputValue('toDiscardField', 'changed');
    });

    // It should still not be modififed
    expect(lastValue()).toBe(false);
  });

  test('should take into account if a field is removed from the DOM', async () => {
    const { component, find } = await setup();

    expect(lastValue()).toBe(false);

    await act(async () => {
      find('hideNameButton').simulate('click');
    });
    component.update();

    expect(lastValue()).toBe(true);
  });
});
