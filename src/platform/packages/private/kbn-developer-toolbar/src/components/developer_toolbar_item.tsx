/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useDeveloperToolbarContext } from '../context/developer_toolbar_context';

export interface DeveloperToolbarItemProps {
  /**
   * Unique identifier for this item. If not provided, a random ID will be generated.
   * Used as user-facing identifier settings and data-test-subj attributes.
   */
  id?: string;

  /**
   * Optional name for this item, used in settings UI. If not provided, the ID will be used.
   */
  name?: string;
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
 * This component should be rendered anywhere in the app tree within a DeveloperToolbarProvider.
 * The children will be portaled to the developer toolbar automatically.
 */
export const DeveloperToolbarItem: React.FC<DeveloperToolbarItemProps> = ({
  id: providedId,
  name,
  children,
  priority = 0,
}) => {
  const { registerItem } = useDeveloperToolbarContext();

  // Generate stable ID if none provided
  const id = useMemo(
    () => providedId ?? `item-${Math.random().toString(36).substring(2, 9)}`,
    [providedId]
  );

  useEffect(() => {
    const unregister = registerItem({
      id,
      name,
      children,
      priority,
    });

    return unregister;
  }, [id, children, priority, registerItem, name]);

  // This component doesn't render anything - it just registers the item
  return null;
};
