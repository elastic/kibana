/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
type TooltipWrapperProps = Partial<Omit<EuiToolTipProps, 'content'>> & {
  tooltipContent: string;
  /** When the condition is truthy, the tooltip will be shown */
  condition: boolean;
};
export declare const TooltipWrapper: React.FunctionComponent<TooltipWrapperProps>;
export {};
