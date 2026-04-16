/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';

import type { ToolItem as ToolItemData } from '../../../types';
import { IconButton } from '../icon_button';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export interface ToolItemProps
  extends Omit<EuiButtonIconProps, 'href' | 'iconType' | 'onClick' | 'onKeyDown'>,
    Omit<ToolItemData, 'sections' | 'renderPopover'> {
  hasContent?: boolean;
  isCollapsed?: boolean;
  isHighlighted: boolean;
  isNew: boolean;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

export const ToolItem = forwardRef<HTMLButtonElement, ToolItemProps>(({ id, ...props }, ref) => (
  <IconButton
    ref={ref as Ref<HTMLElement>}
    data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-toolItem-${id}`}
    {...props}
  />
));
