/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { TimeRange } from '@kbn/es-query';
interface Props {
  timeRange?: TimeRange;
  isAbsoluteTimeByDefault: boolean;
  onTimeTypeChange?: (isAbsolute: boolean) => void;
}
export declare const TimeTypeSection: ({
  timeRange,
  onTimeTypeChange,
  isAbsoluteTimeByDefault,
}: Props) => React.JSX.Element | null;
export {};
