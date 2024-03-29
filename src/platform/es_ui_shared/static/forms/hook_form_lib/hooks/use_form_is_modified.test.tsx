/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useEffect } from 'react';
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

  // We don't add the "lastName" field on purpose to test that we don't set the
  // form "isModified" to true for fields that are not declared in the
  // and that we remove from the DOM
  const formDefaultValue = {
    user: {
      name: 'initialValue',
    },
    toDiscard: 'initialValue',
  };

  const TestComp = ({ onIsModifiedChange, discard = [] }: Props) => {
    const { form } = useForm({ defaultValue: formDefaultValue });
    const isModified = useFormIsModified({ form, discard });
    const [isNameVisible, setIsNameVisible] = useState(true);
    const [isLastNameVisible, setIsLastNameVisible] = useState(true);

    useEffect(() => {
      // Call our jest.spy() with the latest hook value
      onIsModifiedChange(isModified);
    }, [onIsModifiedChange, isModified]);

    return (
      <Form form={form}>
        {isNameVisible && <UseField path="user.name" data-test-subj="nameField" />}
        {isLastNameVisible && <UseField path="user.lastName" data-test-subj="lastNameField" />}

        <UseField path="toDiscard" data-test-subj="toDiscardField" />

        <button data-test-subj="hideNameButton" onClick={() => setIsNameVisible((prev) => !prev)}>
          Toggle show/hide name
        </button>
        <button
          data-test-subj="hideLastNameButton"
          onClick={() => setIsLastNameVisible((prev) => !prev)}
        >
          Toggle show/hide lastname
        </button>
      </Form>
    );
  };

  const onIsModifiedChange = jest.fn();
  const isFormModified = () =>
    onIsModifiedChange.mock.calls[onIsModifiedChange.mock.calls.length - 1][0];

  const setup = registerTestBed(TestComp, {
    defaultProps: { onIsModifiedChange },
    memoryRouter: { wrapComponent: false },
  });

  test('should return true **only** when the field value differs from its initial value', async () => {
    const { form } = await setup();

    expect(isFormModified()).toBe(false);

    await act(async () => {
      form.setInputValue('nameField', 'changed');
    });

    expect(isFormModified()).toBe(true);

    // Put back to the initial value --> isModified should be false
    await act(async () => {
      form.setInputValue('nameField', 'initialValue');
    });
    expect(isFormModified()).toBe(false);
  });

  test('should accepts a list of field to discard', async () => {
    const { form } = await setup({ discard: ['toDiscard'] });

    expect(isFormModified()).toBe(false);

    await act(async () => {
      form.setInputValue('toDiscardField', 'changed');
    });

    // It should still not be modififed
    expect(isFormModified()).toBe(false);
  });

  test('should take into account if a field is removed from the DOM **and** it existed on the form "defaultValue"', async () => {
    const { find } = await setup();

    expect(isFormModified()).toBe(false);

    await act(async () => {
      find('hideNameButton').simulate('click');
    });
    expect(isFormModified()).toBe(true);

    // Put back the name
    await act(async () => {
      find('hideNameButton').simulate('click');
    });
    expect(isFormModified()).toBe(false);

    // Hide the lastname which is **not** in the form defaultValue
    // this it won't set the form isModified to true
    await act(async () => {
      find('hideLastNameButton').simulate('click');
    });
    expect(isFormModified()).toBe(false);
  });
});
