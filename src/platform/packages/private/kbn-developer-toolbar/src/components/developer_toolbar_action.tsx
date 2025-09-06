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

export interface DeveloperToolbarActionProps {
  /**
   * Unique identifier for this action. If not provided, a random ID will be generated.
   */
  id?: string;
  /**
   * The React component(s) to render in the toolbar
   */
  children: ReactNode;
  /**
   * Priority for ordering actions. Higher numbers appear first. Defaults to 0.
   */
  priority?: number;
  /**
   * Tooltip text to show on hover
   */
  tooltip?: string;
}

/**
 * Component that registers an action to be displayed in the developer toolbar.
 * This component should be rendered anywhere in the app tree within a DeveloperToolbarProvider.
 * The children will be portaled to the developer toolbar automatically.
 */
export const DeveloperToolbarAction: React.FC<DeveloperToolbarActionProps> = ({
  id: providedId,
  children,
  priority = 0,
  tooltip,
}) => {
  const { registerAction } = useDeveloperToolbarContext();

  // Generate stable ID if none provided
  const id = useMemo(
    () => providedId ?? `action-${Math.random().toString(36).substring(2, 9)}`,
    [providedId]
  );

  useEffect(() => {
    const unregister = registerAction({
      id,
      children,
      priority,
      tooltip,
    });

    return unregister;
  }, [id, children, priority, tooltip, registerAction]);

  // This component doesn't render anything - it just registers the action
  return null;
};
