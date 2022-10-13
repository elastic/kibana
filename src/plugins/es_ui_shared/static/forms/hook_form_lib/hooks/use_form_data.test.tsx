/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed } from '../shared_imports';
import { Form, UseField } from '../components';
import { useForm } from './use_form';
import { useFormData, HookReturn } from './use_form_data';

interface Props<T extends object> {
  onHookValueChange(data: HookReturn<T>): void;
  watch?: string | string[];
}

interface Form1 {
  title: string;
}

interface Form2 {
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Form3 {
  title: string;
  subTitle: string;
}

describe('useFormData() hook', () => {
  const HookListenerComp = function <T extends object>({ onHookValueChange, watch }: Props<T>) {
    const hookValue = useFormData<T>({ watch });
    const isMounted = useRef(false);

    useEffect(() => {
      if (isMounted.current) {
        onHookValueChange(hookValue);
      }
      isMounted.current = true;
    }, [hookValue, onHookValueChange]);

    return null;
  };

  const HookListener = React.memo(HookListenerComp);

  describe('form data updates', () => {
    let testBed: TestBed;
    let onChangeSpy: jest.Mock;

    const getLastMockValue = () => {
      return onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0] as HookReturn<Form1>;
    };

    const TestComp = (props: Props<Form1>) => {
      const { form } = useForm<Form1>();

      return (
        <Form form={form}>
          <UseField path="title" defaultValue="titleInitialValue" data-test-subj="titleField" />
          <HookListener {...props} />
        </Form>
      );
    };

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    beforeEach(() => {
      onChangeSpy = jest.fn();
      testBed = setup({ onHookValueChange: onChangeSpy }) as TestBed;
    });

    test('should return the form data', () => {
      expect(onChangeSpy).toBeCalledTimes(1);
      const [data] = getLastMockValue();
      expect(data).toEqual({ title: 'titleInitialValue' });
    });

    test('should listen to field changes', async () => {
      const {
        form: { setInputValue },
      } = testBed;

      await act(async () => {
        setInputValue('titleField', 'titleChanged');
      });

      expect(onChangeSpy).toBeCalledTimes(2);
      const [data] = getLastMockValue();
      expect(data).toEqual({ title: 'titleChanged' });
    });
  });

  describe('format form data', () => {
    let onChangeSpy: jest.Mock;

    const getLastMockValue = () => {
      return onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0] as HookReturn<Form2>;
    };

    const TestComp = (props: Props<Form2>) => {
      const { form } = useForm<Form2>();

      return (
        <Form form={form}>
          <UseField path="user.firstName" defaultValue="John" />
          <UseField path="user.lastName" defaultValue="Snow" />
          <HookListener {...props} />
        </Form>
      );
    };

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    beforeEach(() => {
      onChangeSpy = jest.fn();
      setup({ onHookValueChange: onChangeSpy });
    });

    test('should expose a handler to build the form data', () => {
      const [formData] = getLastMockValue();
      expect(formData).toEqual({
        user: {
          firstName: 'John',
          lastName: 'Snow',
        },
      });
    });
  });

  describe('options', () => {
    describe('watch', () => {
      let testBed: TestBed;
      let onChangeSpy: jest.Mock;

      const getLastMockValue = () => {
        return onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0] as HookReturn<Form3>;
      };

      const TestComp = (props: Props<Form3>) => {
        const { form } = useForm<Form3>();

        return (
          <Form form={form}>
            <UseField path="title" defaultValue="titleInitialValue" data-test-subj="titleField" />
            <HookListenerComp {...props} />
            <UseField
              path="subTitle"
              defaultValue="subTitleInitialValue"
              data-test-subj="subTitleField"
            />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        memoryRouter: { wrapComponent: false },
      });

      beforeEach(() => {
        onChangeSpy = jest.fn();
        testBed = setup({ watch: 'title', onHookValueChange: onChangeSpy }) as TestBed;
      });

      test('should not listen to changes on fields we are not interested in', async () => {
        const {
          form: { setInputValue },
        } = testBed;

        await act(async () => {
          // Changing a field we are **not** interested in
          setInputValue('subTitleField', 'subTitleChanged');
          // Changing a field we **are** interested in
          setInputValue('titleField', 'titleChanged');
        });

        const [data] = getLastMockValue();
        expect(data).toEqual({ title: 'titleChanged', subTitle: 'subTitleInitialValue' });
      });
    });

    describe('form', () => {
      let testBed: TestBed;
      let onChangeSpy: jest.Mock;

      const getLastMockValue = () => {
        return onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0] as HookReturn;
      };

      const TestComp = ({ onHookValueChange }: Props<Form1>) => {
        const { form } = useForm();
        const hookValue = useFormData<Form1>({ form });

        useEffect(() => {
          onHookValueChange(hookValue);
        }, [hookValue, onHookValueChange]);

        return (
          <Form form={form}>
            <UseField path="title" defaultValue="titleInitialValue" data-test-subj="titleField" />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        memoryRouter: { wrapComponent: false },
      });

      beforeEach(() => {
        onChangeSpy = jest.fn();
        testBed = setup({ onHookValueChange: onChangeSpy }) as TestBed;
      });

      test('should allow a form to be provided when the hook is called outside of the FormDataContext', async () => {
        const {
          form: { setInputValue },
        } = testBed;

        const [initialData] = getLastMockValue();
        expect(initialData).toEqual({ title: 'titleInitialValue' });

        await act(async () => {
          setInputValue('titleField', 'titleChanged');
        });

        const [updatedData] = getLastMockValue();
        expect(updatedData).toEqual({ title: 'titleChanged' });
      });
    });

    describe('onChange', () => {
      let testBed: TestBed;
      let onChangeSpy: jest.Mock;
      let validationSpy: jest.Mock;

      const TestComp = () => {
        const { form } = useForm();
        useFormData<Form1>({ form, onChange: onChangeSpy });

        return (
          <Form form={form}>
            <UseField
              path="title"
              defaultValue="titleInitialValue"
              data-test-subj="titleField"
              config={{
                validations: [
                  {
                    validator: () => {
                      // This spy should be called **after** the onChangeSpy
                      validationSpy();
                    },
                  },
                ],
              }}
            />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        memoryRouter: { wrapComponent: false },
      });

      beforeEach(() => {
        onChangeSpy = jest.fn();
        validationSpy = jest.fn();
        testBed = setup({ watch: 'title' }) as TestBed;
      });

      test('should call onChange handler _before_ running the validations', async () => {
        const {
          form: { setInputValue },
        } = testBed;

        onChangeSpy.mockReset(); // Reset our counters
        validationSpy.mockReset();

        expect(onChangeSpy).not.toHaveBeenCalled();
        expect(validationSpy).not.toHaveBeenCalled();

        await act(async () => {
          setInputValue('titleField', 'titleChanged');
        });

        expect(onChangeSpy).toHaveBeenCalled();
        expect(validationSpy).toHaveBeenCalled();

        const onChangeCallOrder = onChangeSpy.mock.invocationCallOrder[0];
        const validationCallOrder = validationSpy.mock.invocationCallOrder[0];

        // onChange called before validation
        expect(onChangeCallOrder).toBeLessThan(validationCallOrder);
      });
    });
  });
});
