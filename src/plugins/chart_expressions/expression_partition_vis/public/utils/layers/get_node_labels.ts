/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldFormat, FormatFactory } from '../../../../../field_formats/common';
import { BucketColumns } from '../../../common/types';

export const getNodeLabel = (
  nodeName: unknown,
  column: Partial<BucketColumns>,
  formatters: Record<string, FieldFormat | undefined>,
  defaultFormatFactory: FormatFactory
) => {
  if (column?.meta?.params) {
    const formatter = column?.id ? formatters[column?.id] : undefined;
    if (formatter) {
      return formatter.convert(nodeName) ?? '';
    }
  }

  if (column?.format) {
    return defaultFormatFactory(column.format).convert(nodeName) ?? '';
  }
  return String(nodeName);
};
