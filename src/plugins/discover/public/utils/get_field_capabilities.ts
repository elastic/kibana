/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/common';

export const getFieldCapabilities = (dataView: DataView, field: DataViewField) => {
  const isRuntimeField = Boolean(dataView.getFieldByName(field.name)?.runtimeField);
  const isUnknownField = field.type === 'unknown' || field.type === 'unknown_selected';

  return {
    canEdit: !isUnknownField || isRuntimeField,
    canDelete: isRuntimeField,
  };
};
