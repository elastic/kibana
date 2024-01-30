/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { FieldInput, FieldInputProps } from './field_input';
import { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { TEST_SUBJ_PREFIX_FIELD } from './input';
import { wrap } from './mocks';
import { CodeEditorProps } from './code_editor';

const name = 'test';

jest.mock('./code_editor', () => ({
  CodeEditor: ({ value, onChange }: CodeEditorProps) => (
    <input
      data-test-subj={`management-settings-editField-test`}
      type="text"
      value={String(value)}
      onChange={(e) => {
        if (onChange) {
          onChange(e.target.value, e as any);
        }
      }}
    />
  ),
}));

describe('FieldInput', () => {
  const getDefaultProps = (type: SettingType): FieldInputProps<typeof type> => {
    let options;
    if (type === 'select') {
      options = {
        labels: {
          option1: 'Option 1',
          option2: 'Option 2',
          option3: 'Option 3',
        },
        values: ['option1', 'option2', 'option3'],
      };
    }

    const props: FieldInputProps<typeof type> = {
      field: {
        id: 'test',
        name,
        type,
        ariaAttributes: {
          ariaLabel: 'Test',
        },
        options,
      } as FieldDefinition<typeof type>,
      onInputChange: jest.fn(),
      isSavingEnabled: true,
    };

    return props;
  };

  it('renders without errors', () => {
    const { container } = render(wrap(<FieldInput {...getDefaultProps('string')} />));
    expect(container).toBeInTheDocument();
  });

  it('renders a TextInput for a string field', () => {
    const props = getDefaultProps('string');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a NumberInput for a number field', () => {
    const props = getDefaultProps('number');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a BooleanInput for a boolean field', () => {
    const props = getDefaultProps('boolean');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a ColorInput for a color field', () => {
    const props = getDefaultProps('color');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`euiColorPickerAnchor ${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a ImageInput for a color field', () => {
    const props = getDefaultProps('image');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a JsonInput for a json field', () => {
    const props = getDefaultProps('json');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a MarkdownInput for a markdown field', () => {
    const props = getDefaultProps('markdown');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('renders a SelectInput for an select field', () => {
    const props = {
      ...getDefaultProps('select'),
      value: 'option2',
    };

    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeInTheDocument();
  });

  it('calls the onChange prop when the value changes', () => {
    const props = getDefaultProps('string');
    const { getByTestId } = render(wrap(<FieldInput {...props} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(props.onInputChange).toHaveBeenCalledWith({ type: 'string', unsavedValue: 'new value' });
  });

  it('disables the input when isDisabled prop is true', () => {
    const props = getDefaultProps('string');
    const { getByTestId } = render(wrap(<FieldInput {...props} isSavingEnabled={false} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${name}`);
    expect(input).toBeDisabled();
  });

  it('throws an error if the field and unsavedChange types do not match', () => {
    const consoleMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    [
      'array',
      'boolean',
      'color',
      'image',
      'json',
      'markdown',
      'string',
      'select',
      'undefined',
    ].forEach((type) => {
      expect(() =>
        render(
          wrap(
            <FieldInput
              {...getDefaultProps(type as SettingType)}
              unsavedChange={{ type: 'number', value: 123 } as UnsavedFieldChange<any>}
            />
          )
        )
      ).toThrowError(`Unsaved change for ${type} mismatch: number`);
    });

    expect(() =>
      render(
        wrap(
          <FieldInput
            {...getDefaultProps('number')}
            unsavedChange={{ type: 'string', value: 1 } as UnsavedFieldChange<any>}
          />
        )
      )
    ).toThrowError(`Unsaved change for number mismatch: string`);

    consoleMock.mockRestore();
  });

  it('throws an error if type is unknown or incompatible', () => {
    const consoleMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    const defaultProps = getDefaultProps('string');
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'foobar',
      },
    } as unknown as FieldInputProps;

    expect(() => render(wrap(<FieldInput {...props} />))).toThrowError(
      'Unknown or incompatible field type: foobar'
    );

    consoleMock.mockRestore();
  });
});
