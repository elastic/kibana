/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSuperDatePickerProps } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

export type GetEntireTimeRange = () =>
  | Promise<{ start: string; end: string }>
  | { start: string; end: string };

export interface KbnSuperDatePickerProps extends EuiSuperDatePickerProps {
  uiSettings?: CoreStart['uiSettings'];
  getEntireTimeRange?: GetEntireTimeRange;
}

export interface UseCommonlyUsedRangesProps {
  uiSettings?: CoreStart['uiSettings'];
}

export interface EntireTimeRangePanelProps {
  onTimeChange: EuiSuperDatePickerProps['onTimeChange'];
  getEntireTimeRange: GetEntireTimeRange;
}
