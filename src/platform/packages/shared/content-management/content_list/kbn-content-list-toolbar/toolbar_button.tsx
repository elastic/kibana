/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';

/**
 * Props for the {@link ToolbarButton} component.
 */
export interface ToolbarButtonProps {
  /** Icon type to display in the button. */
  iconType?: string;
  /** Click handler function. */
  onClick: () => void;
  /** Button color variant. */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'text' | 'accent';
  /** Button content to display. */
  children: ReactNode;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `ToolbarButton` component.
 *
 * A convenience wrapper around `EuiButtonEmpty` with consistent styling for toolbar buttons.
 *
 * @param props - The component props. See {@link ToolbarButtonProps}.
 * @returns A React element containing the styled button.
 *
 * @example
 * ```tsx
 * <ContentListToolbar>
 *   <Toolbar.SearchBox />
 *   <Toolbar.Button iconType="plus" onClick={handleCreate}>
 *     Create New
 *   </Toolbar.Button>
 * </ContentListToolbar>
 * ```
 */
export const ToolbarButton = ({
  iconType,
  onClick,
  color = 'primary',
  children,
  'data-test-subj': dataTestSubj,
}: ToolbarButtonProps) => {
  return (
    <EuiButtonEmpty
      size="s"
      iconType={iconType}
      onClick={onClick}
      color={color}
      data-test-subj={dataTestSubj}
    >
      {children}
    </EuiButtonEmpty>
  );
};
