/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { ValueToStringConverter } from './types';

export interface DataTableContext {
  expanded?: DataTableRecord | undefined;
  setExpanded?: (hit?: DataTableRecord) => void;
  rows: DataTableRecord[];
  onFilter?: DocViewFilterFn;
  dataView: DataView;
  isDarkMode: boolean;
  selectedDocs: string[];
  setSelectedDocs: (selected: string[]) => void;
  valueToStringConverter: ValueToStringConverter;
  componentsTourSteps?: Record<string, string>;
}

const defaultContext = {} as unknown as DataTableContext;

export const UnifiedDataTableContext = React.createContext<DataTableContext>(defaultContext);
