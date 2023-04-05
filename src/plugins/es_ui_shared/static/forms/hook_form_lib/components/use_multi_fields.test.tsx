/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';

import { registerTestBed } from '../shared_imports';
import { FieldHook } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseMultiFields } from './use_multi_fields';

describe('<UseMultiFields />', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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

  test('it should return 2 hook fields', () => {
    const onFields = jest.fn();

    const setup = registerTestBed(TestComp, {
      defaultProps: { onFields },
      memoryRouter: { wrapComponent: false },
    });

    setup();

    expect(onFields).toHaveBeenCalled();
    const fieldsReturned = onFields.mock.calls[0][0];

    expect(fieldsReturned.foo.path).toBe(fields.foo.path);
    expect(fieldsReturned.foo.isPristine).toBeDefined(); // It's a FieldHook!
    expect(fieldsReturned.bar.path).toBe(fields.bar.path);
    expect(fieldsReturned.bar.isPristine).toBeDefined();
  });

  test('it should keep a stable ref of initial fields passed', () => {
    const onFields = jest.fn();

    const setup = registerTestBed(TestComp, {
      defaultProps: { onFields },
      memoryRouter: { wrapComponent: false },
    });

    const { find } = setup();

    expect(onFields).toBeCalledTimes(1);
    let fieldsReturned = onFields.mock.calls[0][0] as { [key: string]: FieldHook };
    let paths = Object.values(fieldsReturned).map(({ path }) => path);
    expect(paths).toEqual(['bar', 'foo']);

    // We change the fields passed down to <UseMultiFields />
    find('changeFields').simulate('click');
    expect(onFields).toBeCalledTimes(2);
    fieldsReturned = onFields.mock.calls[1][0] as { [key: string]: FieldHook };
    paths = Object.values(fieldsReturned).map(({ path }) => path);

    // We still get the same 2 fields originally passed
    expect(paths).toEqual(['bar', 'foo']);
  });
});
