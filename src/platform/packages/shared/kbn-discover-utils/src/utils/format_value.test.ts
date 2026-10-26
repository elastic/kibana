/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import {
  FIELD_FORMAT_IDS,
  StaticLookupFormat,
  StringFormat,
} from '@kbn/field-formats-plugin/common';
import { dataViewMock } from '../__mocks__';
import {
  formatFieldStringValueWithHighlights,
  formatFieldValueReact,
  formatFieldValueText,
} from './format_value';

const services = {
  fieldFormats: {
    getDefaultInstance: jest.fn<FieldFormat, [string]>(
      () =>
        ({
          convertToText: (value: unknown) => value,
          convertToReact: (value: unknown) => value,
        } as unknown as FieldFormat)
    ),
  } as unknown as FieldFormatsStart,
};

const hit = {
  _id: '1',
  _index: 'index',
  fields: {
    message: 'foo',
  },
};

describe('formatFieldValueReact', () => {
  afterEach(() => {
    (dataViewMock.getFormatterForField as jest.Mock).mockReset();
  });

  it('should call convertToReact on the correct field formatter', () => {
    const formatterForFieldMock = dataViewMock.getFormatterForField as jest.Mock;
    const convertToReactMock = jest.fn((value: unknown) => `field-formatted:${value}`);
    formatterForFieldMock.mockReturnValue({ convertToReact: convertToReactMock });
    const field = dataViewMock.fields.getByName('message');

    const result = formatFieldValueReact({
      value: 'foo',
      hit,
      fieldFormats: services.fieldFormats,
      dataView: dataViewMock,
      field,
    });

    expect(dataViewMock.getFormatterForField).toHaveBeenCalledWith(field);
    expect(convertToReactMock).toHaveBeenCalledWith('foo', { field, hit });
    expect(result).toBe('field-formatted:foo');
  });

  it('should call convertToReact on default string formatter if no field specified', () => {
    const convertToReactMock = jest.fn((value: unknown) => `default-formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      convertToReact: convertToReactMock,
    });

    const result = formatFieldValueReact({
      value: 'foo',
      hit,
      fieldFormats: services.fieldFormats,
      dataView: dataViewMock,
    });

    expect(services.fieldFormats.getDefaultInstance).toHaveBeenCalledWith('string');
    expect(convertToReactMock).toHaveBeenCalledWith('foo', { field: undefined, hit });
    expect(result).toBe('default-formatted:foo');
  });

  it('should call convertToReact on default string formatter if no dataView is specified', () => {
    const convertToReactMock = jest.fn((value: unknown) => `default-formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      convertToReact: convertToReactMock,
    });

    const result = formatFieldValueReact({
      value: 'foo',
      hit,
      fieldFormats: services.fieldFormats,
    });

    expect(services.fieldFormats.getDefaultInstance).toHaveBeenCalledWith('string');
    expect(convertToReactMock).toHaveBeenCalledWith('foo', { field: undefined, hit });
    expect(result).toBe('default-formatted:foo');
  });

  it('should truncate the value before formatting and append an ellipsis when maxDisplayLength is exceeded', () => {
    const formatterForFieldMock = dataViewMock.getFormatterForField as jest.Mock;
    const convertToReactMock = jest.fn((value: unknown) => `field-formatted:${value}`);
    formatterForFieldMock.mockReturnValue({
      type: { id: FIELD_FORMAT_IDS.STRING },
      param: jest.fn(),
      convertToReact: convertToReactMock,
    });
    const field = dataViewMock.fields.getByName('message');

    const result = formatFieldValueReact({
      value: 'a'.repeat(20),
      hit,
      fieldFormats: services.fieldFormats,
      dataView: dataViewMock,
      field,
      maxDisplayLength: 10,
    });

    expect(convertToReactMock).toHaveBeenCalledWith('a'.repeat(10), { field, hit });
    expect(isValidElement(result)).toBe(true);
    expect((result as ReactElement).props.children).toEqual([
      `field-formatted:${'a'.repeat(10)}`,
      '…',
    ]);
  });

  it('should not truncate the value when it is within maxDisplayLength', () => {
    const formatterForFieldMock = dataViewMock.getFormatterForField as jest.Mock;
    const convertToReactMock = jest.fn((value: unknown) => `field-formatted:${value}`);
    formatterForFieldMock.mockReturnValue({
      type: { id: FIELD_FORMAT_IDS.STRING },
      param: jest.fn(),
      convertToReact: convertToReactMock,
    });
    const field = dataViewMock.fields.getByName('message');

    const result = formatFieldValueReact({
      value: 'foo',
      hit,
      fieldFormats: services.fieldFormats,
      dataView: dataViewMock,
      field,
      maxDisplayLength: 10,
    });

    expect(convertToReactMock).toHaveBeenCalledWith('foo', { field, hit });
    expect(result).toBe('field-formatted:foo');
  });

  it.each([
    [
      'Static Lookup',
      new StaticLookupFormat(
        { lookupEntries: [{ key: 'very-long-key', value: 'mapped' }] },
        jest.fn()
      ),
      'very-long-key',
      'mapped',
    ],
    [
      'String with Short Dots',
      new StringFormat({ transform: 'short' }, jest.fn()),
      'alpha.beta.gamma',
      'a.b.gamma',
    ],
  ])(
    'should not truncate values formatted with %s, which depends on the whole value',
    (_, formatter, value, expected) => {
      (dataViewMock.getFormatterForField as jest.Mock).mockReturnValue(formatter);

      const result = formatFieldValueReact({
        value,
        hit,
        fieldFormats: services.fieldFormats,
        dataView: dataViewMock,
        field: dataViewMock.fields.getByName('message'),
        maxDisplayLength: 10,
      });

      expect(result).toBe(expected);
    }
  );
});

describe('formatFieldStringValueWithHighlights', () => {
  it('should truncate the value before formatting and append an ellipsis when maxDisplayLength is exceeded', () => {
    const convertToReactMock = jest.fn((value: unknown) => `default-formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      type: { id: FIELD_FORMAT_IDS.STRING },
      param: jest.fn(),
      convertToReact: convertToReactMock,
    });

    const result = formatFieldStringValueWithHighlights({
      value: 'a'.repeat(20),
      hit,
      fieldFormats: services.fieldFormats,
      fieldName: 'message',
      maxDisplayLength: 10,
    });

    expect(convertToReactMock).toHaveBeenCalledWith('a'.repeat(10), {
      field: { name: 'message' },
      hit,
    });
    expect(isValidElement(result)).toBe(true);
    expect((result as ReactElement).props.children).toEqual([
      `default-formatted:${'a'.repeat(10)}`,
      '…',
    ]);
  });
});

describe('formatFieldValueText', () => {
  afterEach(() => {
    (dataViewMock.getFormatterForField as jest.Mock).mockReset();
  });

  it('should call convertToText on the correct field formatter', () => {
    const formatterForFieldMock = dataViewMock.getFormatterForField as jest.Mock;
    const convertToTextMock = jest.fn((value: unknown) => `field-formatted:${value}`);
    formatterForFieldMock.mockReturnValue({ convertToText: convertToTextMock });
    const field = dataViewMock.fields.getByName('message');

    const result = formatFieldValueText({
      value: 'foo',
      fieldFormats: services.fieldFormats,
      dataView: dataViewMock,
      field,
    });

    expect(dataViewMock.getFormatterForField).toHaveBeenCalledWith(field);
    expect(convertToTextMock).toHaveBeenCalledWith('foo', undefined);
    expect(result).toBe('field-formatted:foo');
  });

  it('should call convertToText on default string formatter if no field specified', () => {
    const convertToTextMock = jest.fn((value: unknown) => `default-formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      convertToText: convertToTextMock,
    });

    const result = formatFieldValueText({
      value: 'foo',
      fieldFormats: services.fieldFormats,
      dataView: dataViewMock,
    });

    expect(services.fieldFormats.getDefaultInstance).toHaveBeenCalledWith('string');
    expect(convertToTextMock).toHaveBeenCalledWith('foo', undefined);
    expect(result).toBe('default-formatted:foo');
  });

  it('should call convertToText on default string formatter if no dataView is specified', () => {
    const convertToTextMock = jest.fn((value: unknown) => `default-formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      convertToText: convertToTextMock,
    });

    const result = formatFieldValueText({
      value: 'foo',
      fieldFormats: services.fieldFormats,
    });

    expect(services.fieldFormats.getDefaultInstance).toHaveBeenCalledWith('string');
    expect(convertToTextMock).toHaveBeenCalledWith('foo', undefined);
    expect(result).toBe('default-formatted:foo');
  });
});
