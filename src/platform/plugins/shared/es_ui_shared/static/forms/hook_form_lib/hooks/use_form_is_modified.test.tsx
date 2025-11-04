/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  test('should return true **only** when the field value differs from its initial value', async () => {
    const user = userEvent.setup();
    render(<TestComp onIsModifiedChange={onIsModifiedChange} />);

    expect(isFormModified()).toBe(false);

    const nameField = screen.getByTestId('nameField');
    await user.clear(nameField);
    await user.type(nameField, 'changed');

    expect(isFormModified()).toBe(true);

    // Put back to the initial value --> isModified should be false
    await user.clear(nameField);
    await user.type(nameField, 'initialValue');

    expect(isFormModified()).toBe(false);
  });

  test('should accepts a list of field to discard', async () => {
    const user = userEvent.setup();
    render(<TestComp onIsModifiedChange={onIsModifiedChange} discard={['toDiscard']} />);

    expect(isFormModified()).toBe(false);

    const toDiscardField = screen.getByTestId('toDiscardField');
    await user.clear(toDiscardField);
    await user.type(toDiscardField, 'changed');

    // It should still not be modififed
    expect(isFormModified()).toBe(false);
  });

  test('should take into account if a field is removed from the DOM **and** it existed on the form "defaultValue"', async () => {
    const user = userEvent.setup();
    render(<TestComp onIsModifiedChange={onIsModifiedChange} />);

    expect(isFormModified()).toBe(false);

    const hideNameButton = screen.getByTestId('hideNameButton');
    await user.click(hideNameButton);

    expect(isFormModified()).toBe(true);

    // Put back the name
    await user.click(hideNameButton);

    expect(isFormModified()).toBe(false);

    // Hide the lastname which is **not** in the form defaultValue
    // this it won't set the form isModified to true
    const hideLastNameButton = screen.getByTestId('hideLastNameButton');
    await user.click(hideLastNameButton);

    expect(isFormModified()).toBe(false);
  });
});
