/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, IconType } from '@elastic/eui';

export interface UseActionProps {
  onAction: () => void;
  onActionSuccess: () => void;
  onActionError: () => void;
  isDisabled: boolean;
}

export interface ItemsSelectionState {
  selectedItems: string[];
  unSelectedItems: string[];
}

export type ItemSelectableOption<T extends {} = {}> = EuiSelectableOption<
  T & { key: string; itemIcon: IconType; newItem?: boolean }
>;
