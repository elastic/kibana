/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldFormat, FormatFactory } from '../../../../field_formats/common';
import type { Datatable } from '../../../../expressions/public';
import { BucketColumns } from '../../common/types';

export const generateFormatters = (visData: Datatable, formatFactory: FormatFactory) =>
  visData.columns.reduce<Record<string, ReturnType<FormatFactory> | undefined>>(
    (newFormatters, column) => ({
      ...newFormatters,
      [column.id]: column?.meta?.params ? formatFactory(column.meta.params) : undefined,
    }),
    {}
  );

export const getAvailableFormatter = (
  column: Partial<BucketColumns>,
  formatters: Record<string, FieldFormat | undefined>,
  defaultFormatFactory: FormatFactory
) => {
  if (column?.meta?.params) {
    const formatter = column?.id ? formatters[column?.id] : undefined;
    if (formatter) {
      return formatter;
    }
  }

  if (column?.format) {
    return defaultFormatFactory(column.format);
  }
};

export const getFormatter = (
  column: Partial<BucketColumns>,
  formatters: Record<string, FieldFormat | undefined>,
  defaultFormatFactory: FormatFactory
) => getAvailableFormatter(column, formatters, defaultFormatFactory) ?? defaultFormatFactory();
