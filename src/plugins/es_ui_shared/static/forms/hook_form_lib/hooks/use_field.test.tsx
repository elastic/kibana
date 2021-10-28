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
import { FieldHook, FieldValidateResponse, VALIDATION_TYPES } from '..';

describe('useField() hook', () => {
  describe('field.validate()', () => {
    const EMPTY_VALUE = '   ';

    test('It should not invalidate a field with arrayItem validation when isBlocking is false', async () => {
      let fieldHook: FieldHook;

      const TestField = ({ field }: { field: FieldHook }) => {
        fieldHook = field;
        return null;
      };

      const TestForm = () => {
        const { form } = useForm();

        return (
          <Form form={form}>
            <UseField
              path="test-path"
              component={TestField}
              config={{
                validations: [
                  {
                    validator: emptyField('error-message'),
                    type: VALIDATION_TYPES.ARRAY_ITEM,
                    isBlocking: false,
                  },
                ],
              }}
            />
          </Form>
        );
      };

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

    test('It should invalidate an arrayItem field when isBlocking is true', async () => {
      let fieldHook: FieldHook;

      const TestField = ({ field }: { field: FieldHook }) => {
        fieldHook = field;
        return null;
      };

      const TestForm = () => {
        const { form } = useForm();

        return (
          <Form form={form}>
            <UseField
              path="test-path"
              component={TestField}
              config={{
                validations: [
                  {
                    validator: emptyField('error-message'),
                    type: VALIDATION_TYPES.ARRAY_ITEM,
                    isBlocking: true,
                  },
                ],
              }}
            />
          </Form>
        );
      };

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
  });
});
