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
    initialValue,
    validate: jest.fn((value: unknown): Record<string, string | string[]> | undefined => {
      if (typeof value === 'string' && value.length < 3) {
        return { '': 'Too short' };
      }
      return undefined;
    }),
    schema: z.string(),
    widget: 'text',
    meta: {
      widget: 'text',
      label: `Label ${id}`,
    },
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

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    act(() => {
      result.current.handleBlur('username', result.current.values.username);
    });

    act(() => {
      result.current.handleChange('username', 'validValue');
    });

    expect(result.current.errors.username).toBeUndefined();
  });

  it('marks field as touched on blur', () => {
    const fields: FieldDefinition[] = [createMockField('username')];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    act(() => {
      result.current.handleChange('username', 'test');
    });

    expect(result.current.touched.username).toBe(true);

    act(() => {
      result.current.handleBlur('username', result.current.values.username);
    });

    expect(result.current.touched.username).toBe(true);
  });

  it('validates field on blur', () => {
    const fields: FieldDefinition[] = [createMockField('username', 'ab')];

    const { result } = renderHook(() => useFormState(fields));

    act(() => {
      result.current.handleChange('username', 'ab');
    });

    act(() => {
      result.current.handleBlur('username', 'ab');
    });

    expect(fields[0].validate).toHaveBeenCalledWith('ab');
    expect(result.current.errors.username).toBe('Too short');
  });

  it('does not set error if validation passes', () => {
    const fields: FieldDefinition[] = [createMockField('username', 'validUsername')];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    act(() => {
      result.current.handleBlur('username', result.current.values.username);
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

    const { result } = renderHook(() => useFormState<{ username: string; email: string }>(fields));

    act(() => {
      result.current.handleChange('username', 'newUser');
      result.current.handleChange('email', 'new@example.com');
      result.current.handleBlur('username', result.current.values.username);
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
        validate: jest.fn(),
        schema: z.string(),
        widget: 'text',
        meta: { widget: 'text' },
      },
    ];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    expect(result.current.values.username).toBe('');
  });

  it('prefers initialValue over value', () => {
    const fields: FieldDefinition[] = [
      {
        id: 'username',
        initialValue: 'initial',
        value: 'value',
        validate: jest.fn(),
        schema: z.string(),
        widget: 'text',
        meta: { widget: 'text' },
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
        initialValue: 'ab',
        validate: jest.fn(() => ({ '': ['Error 1', 'Error 2'] })),
        schema: z.string(),
        widget: 'text',
        meta: { widget: 'text' },
      },
    ];

    const { result } = renderHook(() => useFormState<{ username: string }>(fields));

    act(() => {
      result.current.handleChange('username', 'ab');
    });

    act(() => {
      result.current.handleBlur('username', result.current.values.username);
    });

    expect(result.current.errors.username).toEqual(['Error 1', 'Error 2']);
  });

  describe('nested field paths (setOptionValue with max 2 levels)', () => {
    interface NestedForm extends Record<string, unknown> {
      config: {
        username: string;
        password: string;
        host: string;
        port: number;
      };
      metadata: {
        tags: string[];
      };
    }

    it('handles 2-level nested path', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: { username: 'admin', password: 'pass' },
          validate: jest.fn(),
          schema: z.object({ username: z.string(), password: z.string() }),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState<NestedForm>(fields));

      act(() => {
        result.current.handleChange('config.username', 'newuser');
      });

      expect(result.current.values.config.username).toBe('newuser');
      expect(result.current.values.config.password).toBe('pass');
    });

    it('creates missing intermediate objects in 2-level path', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: {},
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState<NestedForm>(fields));

      act(() => {
        result.current.handleChange('config.username', 'admin');
      });

      expect(result.current.values.config.username).toBe('admin');
    });

    it('handles nested path with null intermediate value', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: null,
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() =>
        useFormState<{ config: { username: string } | null }>(fields)
      );

      act(() => {
        result.current.handleChange('config.username', 'admin');
      });

      expect(result.current.values.config).toEqual({ username: 'admin' });
    });

    it('handles nested path with undefined intermediate value', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: { host: 'localhost', port: 8080 },
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState<NestedForm>(fields));

      act(() => {
        result.current.handleChange('config.username', 'admin');
      });

      expect(result.current.values.config.username).toBe('admin');
      expect(result.current.values.config.host).toBe('localhost');
      expect(result.current.values.config.port).toBe(8080);
    });

    it('preserves sibling properties when updating nested path', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: {
            username: 'admin',
            password: 'pass',
            host: 'localhost',
            port: 8080,
          },
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState<NestedForm>(fields));

      act(() => {
        result.current.handleChange('config.username', 'newuser');
      });

      expect(result.current.values.config.password).toBe('pass');
      expect(result.current.values.config.host).toBe('localhost');
      expect(result.current.values.config.port).toBe(8080);
    });

    it('handles multiple nested field changes independently', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: {
            username: 'admin',
            password: 'pass',
            host: 'localhost',
            port: 8080,
          },
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState<NestedForm>(fields));

      act(() => {
        result.current.handleChange('config.username', 'user1');
        result.current.handleChange('config.host', 'example.com');
        result.current.handleChange('config.password', 'newpass');
      });

      expect(result.current.values.config).toEqual({
        username: 'user1',
        password: 'newpass',
        host: 'example.com',
        port: 8080,
      });
    });

    it('handles nested path with array values', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'metadata',
          initialValue: { tags: ['tag1', 'tag2'] },
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState<NestedForm>(fields));

      act(() => {
        result.current.handleChange('metadata.tags', ['newTag1', 'newTag2', 'newTag3']);
      });

      expect(result.current.values.metadata.tags).toEqual(['newTag1', 'newTag2', 'newTag3']);
    });

    it('throws error for paths deeper than 2 levels', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'config',
          initialValue: {},
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState(fields));

      expect(() => {
        act(() => {
          result.current.handleChange('config.nested.deep.value', 'test');
        });
      }).toThrow(
        'Nested paths deeper than 2 levels are not supported. Got path: "config.nested.deep.value" with 4 levels.'
      );
    });

    it('throws error for 3-level path', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'level1',
          initialValue: {},
          validate: jest.fn(),
          schema: z.object({}),
          widget: 'formFieldset',
          meta: { widget: 'formFieldset' },
        },
      ];

      const { result } = renderHook(() => useFormState(fields));

      expect(() => {
        act(() => {
          result.current.handleChange('level1.level2.level3', 'value');
        });
      }).toThrow(
        'Nested paths deeper than 2 levels are not supported. Got path: "level1.level2.level3" with 3 levels.'
      );
    });
  });
});
