/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';

import type { PanelHeaderAction } from '../../types';
import { useOptionalNestedMenu } from '../components/nested_secondary_menu/use_nested_menu';

export const usePanelHeaderActions = (
  panelHeaderActions: PanelHeaderAction[] | undefined
): PanelHeaderAction[] | undefined => {
  const nestedMenu = useOptionalNestedMenu();

  return useMemo(
    () =>
      panelHeaderActions?.map((action) => ({
        ...action,
        onClick: action.opensNestedPanel
          ? () => nestedMenu?.goToPanel(action.opensNestedPanel!, action.id)
          : action.onClick,
      })),
    [nestedMenu, panelHeaderActions]
  );
};
