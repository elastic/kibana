/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiBottomBar } from '@elastic/eui';
import { BottomBarContent } from './bottom_bar_content';

export const DATA_TEST_SUBJ_SAVE_BUTTON = 'settings-save-button';
export const DATA_TEST_SUBJ_CANCEL_BUTTON = 'settings-cancel-button';

/**
 * Props for a {@link BottomBar} component.
 */
export interface BottomBarProps {
  onSaveAll: () => void;
  onClearAllUnsaved: () => void;
  hasInvalidChanges: boolean;
  isLoading: boolean;
  unsavedChangesCount: number;
  hiddenChangesCount: number;
}

/**
 * Component for displaying the bottom bar of a {@link Form}.
 */
export const BottomBar = (props: BottomBarProps) => {
  return (
    <EuiBottomBar>
      <BottomBarContent {...props} />
    </EuiBottomBar>
  );
};
