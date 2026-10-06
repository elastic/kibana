/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';
export declare const getDataViewComponentWrapper: (
  getStartServices: () => {
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
    isFilterable: (column: DatatableColumn) => boolean;
  }
) => (props: any) => React.JSX.Element;
