/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { registerTestBed } from '../shared_imports';

import { Form, UseField } from '../components';
import React from 'react';
import { useForm } from '.';
import { emptyField } from '../../helpers/field_validators';
import { FieldHook, FieldValidateResponse, VALIDATION_TYPES, FieldConfig } from '..';

describe('useField() hook', () => {
  let fieldHook: FieldHook;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const TestField = ({ field }: { field: FieldHook }) => {
    fieldHook = field;
    return null;
  };

  const getTestForm = (config?: FieldConfig) => () => {
    const { form } = useForm();

    return (
      <Form form={form}>
        <UseField path="test-path" component={TestField} config={config} />
      </Form>
    );
  };

  describe('field.validate()', () => {
    const EMPTY_VALUE = '   ';

    test('it should not invalidate a field with arrayItem validation when isBlocking is false', async () => {
      const TestForm = getTestForm({
        validations: [
          {
            validator: emptyField('error-message'),
            type: VALIDATION_TYPES.ARRAY_ITEM,
            isBlocking: false,
          },
        ],
      });

      registerTestBed(TestForm)();

      let validateResponse: FieldValidateResponse;

      await act(async () => {
        validateResponse = await fieldHook!.validate({
          value: EMPTY_VALUE,
          validationType: VALIDATION_TYPES.ARRAY_ITEM,
        });
      });

      // validation fails for ARRAY_ITEM with a non-blocking validation error
      expect(validateResponse!).toEqual({
        isValid: false,
        errors: [
          {
            code: 'ERR_FIELD_MISSING',
            path: 'test-path',
            message: 'error-message',
            __isBlocking__: false,
            validationType: 'arrayItem',
          },
        ],
      });

      // expect the field to be valid because the validation error is non-blocking
      expect(fieldHook!.isValid).toBe(true);
    });

    test('it should invalidate an arrayItem field when isBlocking is true', async () => {
      const TestForm = getTestForm({
        validations: [
          {
            validator: emptyField('error-message'),
            type: VALIDATION_TYPES.ARRAY_ITEM,
            isBlocking: true,
          },
        ],
      });

      registerTestBed(TestForm)();

      let validateResponse: FieldValidateResponse;

      await act(async () => {
        validateResponse = await fieldHook!.validate({
          value: EMPTY_VALUE,
          validationType: VALIDATION_TYPES.ARRAY_ITEM,
        });
      });

      // validation fails for ARRAY_ITEM with a blocking validation error
      expect(validateResponse!).toEqual({
        isValid: false,
        errors: [
          {
            code: 'ERR_FIELD_MISSING',
            path: 'test-path',
            message: 'error-message',
            __isBlocking__: true,
            validationType: 'arrayItem',
          },
        ],
      });

      // expect the field to be invalid because the validation error is blocking
      expect(fieldHook!.isValid).toBe(false);
    });

    test('it should only run the FIELD validadtion type when no type is specified', async () => {
      const validatorFn = jest.fn(() => undefined);
      const TestForm = getTestForm({
        validations: [
          {
            validator: validatorFn,
            type: VALIDATION_TYPES.ARRAY_ITEM,
          },
        ],
      });

      registerTestBed(TestForm)();

      act(() => {
        // This should **not** call our validator as it is of type ARRAY_ITEM
        // and here, as we don't specify the validation type, we validate the default "FIELD" type.
        fieldHook!.validate({
          value: 'foo',
          validationType: undefined, // Although not necessary adding it to be explicit
        });
      });

      expect(validatorFn).toBeCalledTimes(0);
    });
  });
});
