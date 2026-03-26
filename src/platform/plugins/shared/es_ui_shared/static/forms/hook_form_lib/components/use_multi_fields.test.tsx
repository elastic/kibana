/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FieldHook } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseMultiFields } from './use_multi_fields';

const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const onFieldsMock = jest.fn();

const fields = {
  foo: { path: 'foo' },
  bar: { path: 'bar' },
};

const TestComp = ({ onFields }: { onFields: (fields: { [x: string]: FieldHook }) => void }) => {
  const { form } = useForm();
  const [stateFields, setStateFields] = useState<{ [key: string]: any }>(fields);

  const changeStateFields = () => {
    // We'll make sure that if other fields are passed down after the initial
    // rendering of <UseMultiField /> the change does not create new FieldHook as that
    // would break the **order** of hooks declared inside <UseMultiFields />

    setStateFields({
      aaa: { path: 'aaa' }, // we add this field that will come first when sorting() A-Z
      ...fields,
    });
  };

  return (
    <Form form={form}>
      <UseMultiFields fields={stateFields}>
        {(hookFields) => {
          onFields(hookFields);
          return null;
        }}
      </UseMultiFields>
      <button onClick={changeStateFields} data-test-subj="changeFields">
        Change fields
      </button>
    </Form>
  );
};

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<UseMultiFields />', () => {
  test('it should return 2 hook fields', () => {
    render(<TestComp onFields={onFieldsMock} />);

    expect(onFieldsMock).toHaveBeenCalled();
    const fieldsReturned = onFieldsMock.mock.calls[0][0];

    expect(fieldsReturned.foo.path).toBe(fields.foo.path);
    expect(fieldsReturned.foo.isPristine).toBeDefined(); // It's a FieldHook!
    expect(fieldsReturned.bar.path).toBe(fields.bar.path);
    expect(fieldsReturned.bar.isPristine).toBeDefined();
  });

  test('it should keep a stable ref of initial fields passed', async () => {
    render(<TestComp onFields={onFieldsMock} />);

    expect(onFieldsMock).toBeCalledTimes(1);
    let fieldsReturned = onFieldsMock.mock.calls[0][0] as { [key: string]: FieldHook };
    let paths = Object.values(fieldsReturned).map(({ path }) => path);
    expect(paths).toEqual(['bar', 'foo']);

    // We change the fields passed down to <UseMultiFields />
    const button = await screen.findByTestId('changeFields');
    await user.click(button);

    // Check that onFields was called again (button click may trigger multiple re-renders)
    expect(onFieldsMock.mock.calls.length).toBeGreaterThan(1);
    fieldsReturned = onFieldsMock.mock.calls[onFieldsMock.mock.calls.length - 1][0] as {
      [key: string]: FieldHook;
    };
    paths = Object.values(fieldsReturned).map(({ path }) => path);

    // We still get the same 2 fields originally passed
    expect(paths).toEqual(['bar', 'foo']);
  });
});
