/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { SettingType } from '@kbn/management-settings-types';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { KnownTypeToMetadata } from '@kbn/management-settings-types/metadata';

import { DATA_TEST_SUBJ_SCREEN_READER_MESSAGE, FieldRow } from './field_row';
import { wrap } from './mocks';

import { TEST_SUBJ_PREFIX_FIELD } from '@kbn/management-settings-components-field-input/input';
import { DATA_TEST_SUBJ_RESET_PREFIX } from './footer/reset_link';
import { DATA_TEST_SUBJ_CHANGE_LINK_PREFIX } from './footer/change_image_link';

const defaults = {
  requiresPageReload: false,
  readonly: false,
  category: ['category'],
};

const defaultValues: Record<SettingType, any> = {
  array: ['example_value'],
  boolean: true,
  color: '#FF00CC',
  image: '',
  json: "{ foo: 'bar2' }",
  markdown: 'Hello World',
  number: 1,
  select: 'apple',
  string: 'hello world',
  undefined: 'undefined',
};

const defaultInputValues: Record<SettingType, any> = {
  array: 'example_value',
  boolean: true,
  color: '#FF00CC',
  image: '',
  json: '{"hello": "world"}',
  markdown: '**bold**',
  number: 1,
  select: 'apple',
  string: 'hello world',
  undefined: 'undefined',
};

const userValues: Record<SettingType, any> = {
  array: ['user', 'value'],
  boolean: false,
  image: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  json: '{"hello": "world"}',
  markdown: '**bold**',
  number: 10,
  select: 'banana',
  string: 'foo',
  color: '#FACF0C',
  undefined: 'something',
};

const userInputValues: Record<SettingType, any> = {
  array: 'user, value',
  boolean: false,
  image: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  json: '{"hello": "world"}',
  markdown: '**bold**',
  number: 10,
  select: 'banana',
  string: 'foo',
  color: '#FACF0C',
  undefined: 'something',
};

type Settings = {
  [key in SettingType]: KnownTypeToMetadata<key>;
};

const settings: Omit<Settings, 'markdown' | 'json'> = {
  array: {
    description: 'Description for Array test setting',
    name: 'array:test:setting',
    type: 'array',
    userValue: null,
    value: defaultValues.array,
    ...defaults,
  },
  boolean: {
    description: 'Description for Boolean test setting',
    name: 'boolean:test:setting',
    type: 'boolean',
    userValue: null,
    value: defaultValues.boolean,
    ...defaults,
  },
  color: {
    description: 'Description for Color test setting',
    name: 'color:test:setting',
    type: 'color',
    userValue: null,
    value: defaultValues.color,
    ...defaults,
  },
  image: {
    description: 'Description for Image test setting',
    name: 'image:test:setting',
    type: 'image',
    userValue: null,
    value: defaultValues.image,
    ...defaults,
  },
  // This is going to take a lot of mocks to test.
  //
  // json: {
  //   name: 'json:test:setting',
  //   description: 'Description for Json test setting',
  //   type: 'json',
  //   userValue: '{"foo": "bar"}',
  //   value: '{}',
  //   ...defaults,
  // },
  //
  // This is going to take a lot of mocks to test.
  //
  // markdown: {
  //   name: 'markdown:test:setting',
  //   description: 'Description for Markdown test setting',
  //   type: 'markdown',
  //   userValue: null,
  //   value: '',
  //   ...defaults,
  // },
  number: {
    description: 'Description for Number test setting',
    name: 'number:test:setting',
    type: 'number',
    userValue: null,
    value: defaultValues.number,
    ...defaults,
  },
  select: {
    description: 'Description for Select test setting',
    name: 'select:test:setting',
    options: ['apple', 'orange', 'banana'],
    optionLabels: {
      apple: 'Apple',
      orange: 'Orange',
      banana: 'Banana',
    },
    type: 'select',
    userValue: null,
    value: defaultValues.select,
    ...defaults,
  },
  string: {
    description: 'Description for String test setting',
    name: 'string:test:setting',
    type: 'string',
    userValue: null,
    value: defaultValues.string,
    ...defaults,
  },
  undefined: {
    description: 'Description for Undefined test setting',
    name: 'undefined:test:setting',
    type: 'undefined',
    userValue: null,
    value: defaultValues.undefined,
    ...defaults,
  },
};

const handleChange = jest.fn();

describe('Field', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  (Object.keys(settings) as SettingType[]).forEach((type) => {
    if (type === 'json' || type === 'markdown') {
      return;
    }

    const setting = settings[type];
    const id = settings[type].name || type;
    const inputTestSubj = `${TEST_SUBJ_PREFIX_FIELD}-${id}`;

    describe(`for ${type} setting`, () => {
      it('should render', () => {
        const { container } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({ id, setting })}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );

        expect(container).toBeInTheDocument();
      });

      it('should render default value if there is no user value set', () => {
        const { getByTestId } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({ id, setting })}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );

        if (type === 'boolean') {
          expect(getByTestId(inputTestSubj)).toHaveAttribute('aria-checked', 'true');
        } else if (type === 'color') {
          expect(getByTestId(`euiColorPickerAnchor ${inputTestSubj}`)).toHaveValue(
            defaultInputValues[type]
          );
        } else if (type === 'number') {
          expect(getByTestId(inputTestSubj)).toHaveValue(defaultInputValues[type]);
        } else if (type === 'image') {
          expect(getByTestId(inputTestSubj)).toBeInTheDocument();
          expect(getByTestId(inputTestSubj)).toHaveAttribute('type', 'file');
        } else {
          expect(getByTestId(inputTestSubj)).toHaveValue(String(defaultInputValues[type]) as any);
        }
      });

      it('should render as read only with help text if overridden', async () => {
        const { getByTestId } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({
                id,
                setting,
                params: { isOverridden: true },
              })}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );
        if (type === 'color') {
          expect(getByTestId(`euiColorPickerAnchor ${inputTestSubj}`)).toBeDisabled();
        } else {
          expect(getByTestId(inputTestSubj)).toBeDisabled();
        }

        // expect(getByTestId(`${DATA_TEST_SUBJ_OVERRIDDEN_PREFIX}-${id}`)).toBeInTheDocument();
      });

      it('should render as read only if saving is disabled', () => {
        const { getByTestId } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({
                id,
                setting,
              })}
              onFieldChange={handleChange}
              isSavingEnabled={false}
            />
          )
        );
        if (type === 'color') {
          expect(getByTestId(`euiColorPickerAnchor ${inputTestSubj}`)).toBeDisabled();
        } else {
          expect(getByTestId(inputTestSubj)).toBeDisabled();
        }
      });

      it('should render user value if there is user value is set', async () => {
        const { getByTestId, getByAltText } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({
                id,
                setting: {
                  ...setting,
                  userValue: userValues[type] as any,
                },
              })}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );

        if (type === 'boolean') {
          expect(getByTestId(inputTestSubj)).toHaveAttribute('aria-checked', 'false');
        } else if (type === 'color') {
          expect(getByTestId(`euiColorPickerAnchor ${inputTestSubj}`)).toHaveValue(
            userValues[type]
          );
        } else if (type === 'number') {
          expect(getByTestId(inputTestSubj)).toHaveValue(userValues[type]);
        } else if (type === 'image') {
          expect(getByAltText(id)).toBeInTheDocument();
          expect(getByAltText(id)).toHaveAttribute('src', userValues[type]);
        } else {
          expect(getByTestId(inputTestSubj)).toHaveValue(String(userInputValues[type]) as any);
        }
      });

      it('should render custom setting icon if it is custom', () => {
        const { getByText } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({
                id,
                setting,
                params: { isCustom: true },
              })}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );

        expect(getByText('Custom setting')).toBeInTheDocument();
      });

      it('should render unsaved value if there are unsaved changes', () => {
        const { getByTestId, getByAltText } = render(
          wrap(
            <FieldRow
              field={getFieldDefinition({
                id,
                setting: { ...setting, userValue: userValues[type] as any },
                params: { isCustom: true },
              })}
              unsavedChange={{
                type,
                unsavedValue: userValues[type] as any,
              }}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );

        if (type === 'boolean') {
          expect(getByTestId(inputTestSubj)).toHaveAttribute('aria-checked', 'false');
        } else if (type === 'color') {
          expect(getByTestId(`euiColorPickerAnchor ${inputTestSubj}`)).toHaveValue(
            userInputValues[type]
          );
        } else if (type === 'number') {
          expect(getByTestId(inputTestSubj)).toHaveValue(userInputValues[type]);
        } else if (type === 'image') {
          expect(getByAltText(id)).toBeInTheDocument();
          expect(getByAltText(id)).toHaveAttribute('src', userValues[type]);
        } else {
          expect(getByTestId(inputTestSubj)).toHaveValue(String(userInputValues[type]) as any);
        }
      });

      it('should reset when reset link is clicked', () => {
        const field = getFieldDefinition({
          id,
          setting: {
            ...setting,
            userValue: userValues[type],
          },
        });

        const { getByTestId } = render(
          wrap(<FieldRow field={field} onFieldChange={handleChange} isSavingEnabled={true} />)
        );

        const input = getByTestId(`${DATA_TEST_SUBJ_RESET_PREFIX}-${field.id}`);
        fireEvent.click(input);
        expect(handleChange).toHaveBeenCalledWith(field.id, {
          type,
          unsavedValue: field.defaultValue,
        });
      });

      it('should reset when reset link is clicked with an unsaved change', () => {
        const field = getFieldDefinition({
          id,
          setting,
        });

        const { getByTestId } = render(
          wrap(
            <FieldRow
              field={field}
              unsavedChange={{ type, unsavedValue: userValues[type] }}
              onFieldChange={handleChange}
              isSavingEnabled={true}
            />
          )
        );

        const input = getByTestId(`${DATA_TEST_SUBJ_RESET_PREFIX}-${field.id}`);
        fireEvent.click(input);
        expect(handleChange).toHaveBeenCalledWith(field.id, undefined);
      });
    });
  });

  it('should fire onFieldChange when input changes', () => {
    const setting = settings.string;
    const field = getFieldDefinition({ id: setting.name || setting.type, setting });

    const { getByTestId } = render(
      wrap(<FieldRow field={field} onFieldChange={handleChange} isSavingEnabled={true} />)
    );

    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${field.id}`);
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalledWith(field.id, {
      type: 'string',
      unsavedValue: 'new value',
    });
  });

  it('should fire onFieldChange with an error when input changes with invalid value', () => {
    const setting = settings.color;
    const field = getFieldDefinition({ id: setting.name || setting.type, setting });

    const { getByTestId } = render(
      wrap(<FieldRow field={field} onFieldChange={handleChange} isSavingEnabled={true} />)
    );

    const input = getByTestId(`euiColorPickerAnchor ${TEST_SUBJ_PREFIX_FIELD}-${field.id}`);
    fireEvent.change(input, { target: { value: '#1234' } });

    expect(handleChange).toHaveBeenCalledWith(field.id, {
      type: 'color',
      error: 'Provide a valid color value',
      isInvalid: true,
      unsavedValue: '#1234',
    });
  });

  it('should show screen reader content with an unsaved change.', () => {
    const setting = settings.color;
    const field = getFieldDefinition({ id: setting.name || setting.type, setting });

    const { getByText, getByTestId } = render(
      wrap(
        <FieldRow
          field={field}
          onFieldChange={handleChange}
          isSavingEnabled={true}
          unsavedChange={{
            type: setting.type,
            unsavedValue: '#123456',
          }}
        />
      )
    );

    expect(getByText('Setting is currently not saved.')).toBeInTheDocument();
    const input = getByTestId(`euiColorPickerAnchor ${TEST_SUBJ_PREFIX_FIELD}-${field.id}`);
    fireEvent.change(input, { target: { value: '#1235' } });

    waitFor(() => expect(input).toHaveValue('#1235'));

    waitFor(() =>
      expect(getByTestId(`${DATA_TEST_SUBJ_SCREEN_READER_MESSAGE}-${field.id}`)).toBe(
        'Provide a valid color value'
      )
    );
  });

  it('should clear the unsaved value if the new value matches the saved value', () => {
    const setting = settings.string;
    const field = getFieldDefinition({
      id: setting.name || setting.type,
      setting: {
        ...setting,
        userValue: 'saved value',
      },
    });

    const unsavedChange = {
      type: 'string' as const,
      unsavedValue: 'new value',
    };

    const { getByTestId } = render(
      wrap(
        <FieldRow
          {...{ field, unsavedChange }}
          onFieldChange={handleChange}
          isSavingEnabled={true}
        />
      )
    );

    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${field.id}`);
    fireEvent.change(input, { target: { value: field.savedValue } });
    expect(handleChange).toHaveBeenCalledWith(field.id, undefined);
  });

  it('should clear the current image when Change Image is clicked', () => {
    const setting = settings.image;

    const field = getFieldDefinition({
      id: setting.name || setting.type,
      setting: {
        ...setting,
        userValue: userInputValues.image,
      },
    });

    const { getByTestId, getByAltText } = render(
      wrap(<FieldRow {...{ field }} onFieldChange={handleChange} isSavingEnabled={true} />)
    );

    const link = getByTestId(`${DATA_TEST_SUBJ_CHANGE_LINK_PREFIX}-${field.id}`);
    fireEvent.click(link);
    waitFor(() => expect(getByAltText(field.id)).not.toBeInTheDocument());
  });

  it('should clear the unsaved image when Change Image is clicked', () => {
    const setting = settings.image;

    const field = getFieldDefinition({
      id: setting.name || setting.type,
      setting: {
        ...setting,
      },
    });

    const { getByTestId, getByAltText } = render(
      wrap(
        <FieldRow
          {...{ field }}
          onFieldChange={handleChange}
          unsavedChange={{ type: 'image', unsavedValue: userInputValues.image }}
          isSavingEnabled={true}
        />
      )
    );

    const link = getByTestId(`${DATA_TEST_SUBJ_CHANGE_LINK_PREFIX}-${field.id}`);
    fireEvent.click(link);
    waitFor(() => expect(getByAltText(field.id)).not.toBeInTheDocument());
  });
});
