/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import type { DataTableColumnTypes } from '../types';

const TOKEN_CLASS = 'unifiedDataTable__fieldToken';

function getRenderedFieldToken({
  dataView,
  fieldName,
  columnTypes,
}: {
  dataView: DataView;
  fieldName: string | null;
  columnTypes?: DataTableColumnTypes;
}) {
  if (!fieldName) {
    return null;
  }

  // for text-based searches
  if (columnTypes) {
    return columnTypes[fieldName] && columnTypes[fieldName] !== 'unknown' ? ( // renders an icon or nothing
      <FieldIcon type={columnTypes[fieldName]} className={TOKEN_CLASS} />
    ) : null;
  }

  const dataViewField = dataView.getFieldByName(fieldName);

  if (dataViewField) {
    return <FieldIcon {...getFieldIconProps(dataViewField)} className={TOKEN_CLASS} />;
  }

  if (isNestedFieldParent(fieldName, dataView)) {
    return <FieldIcon type="nested" className={TOKEN_CLASS} />;
  }

  return null;
}
