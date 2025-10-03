/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';

import { SecondaryMenu } from '../secondary_menu';
import { useNestedMenu } from './use_nested_menu';
import { getFocusableElements } from '../../utils/get_focusable_elements';

export interface PanelProps {
  children: ReactNode;
  id: string;
  title?: string;
}

export const Panel: FC<PanelProps> = ({ children, id, title }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { currentPanel, panelStackDepth, returnFocusId } = useNestedMenu();

  useEffect(() => {
    if (currentPanel !== id) return;

    // If we have a return focus id, we focus the trigger element
    if (returnFocusId) {
      const triggerElement = document.getElementById(returnFocusId);
      if (triggerElement) return triggerElement.focus();
    }

    // If we are at the root panel, we don't need to focus anything
    if (panelStackDepth === 0) return;

    // Otherwise, we focus the first focusable element in the panel
    if (panelRef.current) {
      const elements = getFocusableElements(panelRef.current);
      elements[0]?.focus();
    }
    // We want to focus the appropriate element when the panel becomes active
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef.current, currentPanel, id, returnFocusId, panelStackDepth]);

  if (currentPanel !== id) {
    return null;
  }

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
