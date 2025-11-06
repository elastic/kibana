/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { FC, ReactNode } from 'react';

import { SecondaryMenu } from '../secondary_menu';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { useNestedMenu } from './use_nested_menu';

export interface PanelProps {
  children: ReactNode;
  id: string;
  title?: string;
}

export const Panel: FC<PanelProps> = ({ children, id, title }) => {
  const { currentPanel, panelStackDepth, returnFocusId } = useNestedMenu();

  const panelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (currentPanel !== id) return;

      // If we have a return focus id, we focus the trigger element
      if (returnFocusId && node) {
        const triggerElement = node.querySelector<HTMLElement>(`#${CSS.escape(returnFocusId)}`);
        if (triggerElement) return triggerElement.focus();
      }

      // If we are at the root panel, we don't need to focus anything
      if (panelStackDepth === 0) return;

      // Otherwise, we focus the first focusable element in the panel
      if (node) {
        const elements = getFocusableElements(node);
        elements[0]?.focus();
      }
    },
    [currentPanel, id, panelStackDepth, returnFocusId]
  );

  if (currentPanel !== id) return null;

  if (title) {
    return (
      <SecondaryMenu
        data-test-subj={`nestedSecondaryMenuPanel-${id}`}
        ref={panelRef}
        title={title}
        isPanel={false}
      >
        {children}
      </SecondaryMenu>
    );
  }

  return (
    <div data-test-subj={`nestedSecondaryMenuPanel-${id}`} ref={panelRef}>
      {children}
    </div>
  );
};
