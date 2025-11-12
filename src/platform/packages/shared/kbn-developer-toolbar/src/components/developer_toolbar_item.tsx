/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type ReactNode, useEffect } from 'react';
import { useToolbarState } from '../hooks';

export interface DeveloperToolbarItemProps {
  /**
   * Unique identifier for this item.
   * Used as user-facing identifier in settings and data-test-subj attributes.
   */
  id: string;

  /**
   * The React component(s) to render in the toolbar
   */
  children: ReactNode;

  /**
   * Priority for ordering items. Higher numbers appear first. Defaults to 0.
   */
  priority?: number;
}

/**
 * Component that registers an item to be displayed in the developer toolbar.
 * This component can be rendered anywhere in the app tree.
 * The children will be portaled to the developer toolbar automatically.
 */
export const DeveloperToolbarItem: React.FC<DeveloperToolbarItemProps> = ({
  id,
  children,
  priority,
}) => {
  const { registerItem } = useToolbarState();

  useEffect(() => {
    const unregister = registerItem({
      id,
      children,
      priority,
    });

    return unregister;
  }, [children, priority, registerItem, id]);

  // This component doesn't render anything - it just registers the item
  return null;
};
