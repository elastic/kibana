/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { useFormState } from './use_form_state';
import type { FieldDefinition } from './form';

describe('useFormState', () => {
  const createMockField = (id: string, initialValue?: unknown): FieldDefinition => ({
    id,
    staticProps: {
      fullWidth: true,
      label: `Label ${id}`,
    },
    initialValue,
    validate: jest.fn((value: unknown) => {
      if (typeof value === 'string' && value.length < 3) {
        return 'Too short';
      }
      return undefined;
    }),
    schema: z.string(),
    widget: 'text',
  });

  it('initializes with correct values', () => {
    const fields: FieldDefinition[] = [
      createMockField('username', 'defaultUser'),
      createMockField('email', ''),
    ];

    const { result } = renderHook(() => useFormState(fields));

    expect(result.current.values).toEqual({
      username: 'defaultUser',
      email: '',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('handles field change', () => {
    const fields: FieldDefinition[] = [createMockField('username')];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    act(() => {
      result.current.handleChange('username', 'newValue');
    });

    expect(result.current.values.username).toBe('newValue');
  });

  it('clears errors on field change', () => {
    const fields: FieldDefinition[] = [createMockField('username')];

    const { result } = renderHook(() => useFormState(fields));

    // Set an error first
    act(() => {
      result.current.handleBlur('username');
    });

    // Change the field value
    act(() => {
      result.current.handleChange('username', 'validValue');
    });

    expect(result.current.errors.username).toBe('');
  });

  it('marks field as touched on blur', () => {
    const fields: FieldDefinition[] = [createMockField('username')];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleBlur('username');
    });

    expect(result.current.touched.username).toBe(true);
  });

  it('validates field on blur', () => {
    const fields: FieldDefinition[] = [createMockField('username', 'ab')];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleBlur('username');
    });

    expect(fields[0].validate).toHaveBeenCalledWith('ab');
    expect(result.current.errors.username).toBe('Too short');
  });

  it('does not set error if validation passes', () => {
    const fields: FieldDefinition[] = [createMockField('username', 'validUsername')];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleBlur('username');
    });

    expect(result.current.errors.username).toBeUndefined();
  });

  it('handles form submission with valid data', () => {
    const mockOnSuccess = jest.fn();
    const fields: FieldDefinition[] = [createMockField('username', 'validUser')];

    const { result } = renderHook(() => useFormState(fields));

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent;

    act(() => {
      result.current.handleSubmit(mockOnSuccess)(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalledWith({
      data: { username: 'validUser' },
    });
  });

  it('handles form submission with invalid data', () => {
    const mockOnSuccess = jest.fn();
    const fields: FieldDefinition[] = [createMockField('username', 'ab')];

    const { result } = renderHook(() => useFormState(fields));

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent;

    act(() => {
      result.current.handleSubmit(mockOnSuccess)(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(result.current.errors.username).toBe('Too short');
  });

  it('marks all fields as touched on submit', () => {
    const mockOnSuccess = jest.fn();
    const fields: FieldDefinition[] = [
      createMockField('username', 'validUser'),
      createMockField('email', 'test@example.com'),
    ];

    const { result } = renderHook(() => useFormState(fields));

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent;

    act(() => {
      result.current.handleSubmit(mockOnSuccess)(mockEvent);
    });

    expect(result.current.touched).toEqual({
      username: true,
      email: true,
    });
  });

  it('validates all fields on submit', () => {
    const mockOnSuccess = jest.fn();
    const fields: FieldDefinition[] = [
      createMockField('username', 'ab'),
      createMockField('email', 'x'),
    ];

    const { result } = renderHook(() => useFormState(fields));

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent;

    act(() => {
      result.current.handleSubmit(mockOnSuccess)(mockEvent);
    });

    expect(fields[0].validate).toHaveBeenCalledWith('ab');
    expect(fields[1].validate).toHaveBeenCalledWith('x');
    expect(result.current.errors).toEqual({
      username: 'Too short',
      email: 'Too short',
    });
  });

  it('resets form to initial values', () => {
    const fields: FieldDefinition[] = [
      createMockField('username', 'defaultUser'),
      createMockField('email', 'default@example.com'),
    ];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleChange('username', 'newUser');
      result.current.handleChange('email', 'new@example.com');
      result.current.handleBlur('username');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual({
      username: 'defaultUser',
      email: 'default@example.com',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('uses empty string as default value when initialValue and value are undefined', () => {
    const fields: FieldDefinition[] = [
      {
        id: 'username',
        staticProps: { fullWidth: true },
        validate: jest.fn(),
        schema: z.string(),
        widget: 'text',
      },
    ];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    expect(result.current.values.username).toBe('');
  });

  it('prefers initialValue over value', () => {
    const fields: FieldDefinition[] = [
      {
        id: 'username',
        staticProps: { fullWidth: true },
        initialValue: 'initial',
        value: 'value',
        validate: jest.fn(),
        schema: z.string(),
        widget: 'text',
      },
    ];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    expect(result.current.values.username).toBe('initial');
  });

  it('handles multiple field changes', () => {
    const fields: FieldDefinition[] = [
      createMockField('username', ''),
      createMockField('email', ''),
      createMockField('password', ''),
    ];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleChange('username', 'user1');
      result.current.handleChange('email', 'user1@example.com');
      result.current.handleChange('password', 'password123');
    });

    expect(result.current.values).toEqual({
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123',
    });
  });

  it('handles validation errors as array', () => {
    const fields: FieldDefinition[] = [
      {
        id: 'username',
        staticProps: { fullWidth: true },
        initialValue: 'ab',
        validate: jest.fn(() => ['Error 1', 'Error 2']),
        schema: z.string(),
        widget: 'text',
      },
    ];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleBlur('username');
    });

    expect(result.current.errors.username).toEqual(['Error 1', 'Error 2']);
  });
});
