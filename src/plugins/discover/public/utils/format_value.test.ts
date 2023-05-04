/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { dataViewMock } from '../__mocks__/data_view';
import { formatFieldValue } from './format_value';

const services = {
  fieldFormats: {
    getDefaultInstance: jest.fn<FieldFormat, [string]>(
      () => ({ convert: (value: unknown) => value } as FieldFormat)
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

describe('formatFieldValue', () => {
  afterEach(() => {
    (dataViewMock.getFormatterForField as jest.Mock).mockReset();
  });

  it('should call correct fieldFormatter for field', () => {
    const formatterForFieldMock = dataViewMock.getFormatterForField as jest.Mock;
    const convertMock = jest.fn((value: unknown) => `formatted:${value}`);
    formatterForFieldMock.mockReturnValue({ convert: convertMock });
    const field = dataViewMock.fields.getByName('message');
    expect(formatFieldValue('foo', hit, services.fieldFormats, dataViewMock, field)).toBe(
      'formatted:foo'
    );
    expect(dataViewMock.getFormatterForField).toHaveBeenCalledWith(field);
    expect(convertMock).toHaveBeenCalledWith('foo', 'html', { field, hit });
  });

  it('should call default string formatter if no field specified', () => {
    const convertMock = jest.fn((value: unknown) => `formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      convert: convertMock,
    });
    expect(formatFieldValue('foo', hit, services.fieldFormats, dataViewMock)).toBe('formatted:foo');
    expect(services.fieldFormats.getDefaultInstance).toHaveBeenCalledWith('string');
    expect(convertMock).toHaveBeenCalledWith('foo', 'html', { field: undefined, hit });
  });

  it('should call default string formatter if no dataView is specified', () => {
    const convertMock = jest.fn((value: unknown) => `formatted:${value}`);
    (services.fieldFormats.getDefaultInstance as jest.Mock).mockReturnValue({
      convert: convertMock,
    });
    expect(formatFieldValue('foo', hit, services.fieldFormats)).toBe('formatted:foo');
    expect(services.fieldFormats.getDefaultInstance).toHaveBeenCalledWith('string');
    expect(convertMock).toHaveBeenCalledWith('foo', 'html', { field: undefined, hit });
  });
});
