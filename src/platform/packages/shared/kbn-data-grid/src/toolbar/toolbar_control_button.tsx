/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

/** A button of the toolbar with an icon only and a tooltip, like the ones of `EuiDataGrid`. */
export const ToolbarIconButton = ({
  'aria-label': ariaLabel,
  tooltipContent,
  ...props
}: ComponentProps<typeof EuiButtonIcon> & { tooltipContent?: React.ReactNode }) => (
  <EuiToolTip content={tooltipContent ?? ariaLabel} disableScreenReaderOutput>
    <EuiButtonIcon size="xs" color="text" aria-label={ariaLabel} {...props} />
  </EuiToolTip>
);
