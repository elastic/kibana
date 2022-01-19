/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FormatFactory } from '../../../../../field_formats/common';
import type { Datatable } from '../../../../../expressions/public';
import { PartitionVisParams } from '../../../common/types';

export const generateFormatters = (
  visParams: PartitionVisParams,
  visData: Datatable,
  formatFactory: FormatFactory
) => {
  if (!visParams.labels.show) {
    return {};
  }

  return visData.columns.reduce<Record<string, ReturnType<FormatFactory> | undefined>>(
    (newFormatters, column) => ({
      ...newFormatters,
      [column.id]: column?.meta?.params ? formatFactory(column.meta.params) : undefined,
    }),
    {}
  );
};
