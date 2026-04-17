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
import { useDesignerToolbarState } from '../hooks/use_designer_toolbar_state';

export interface DesignerToolbarItemProps {
  id: string;
  children: ReactNode;
  priority?: number;
}

export const DesignerToolbarItem: React.FC<DesignerToolbarItemProps> = ({
  id,
  children,
  priority,
}) => {
  const { registerItem } = useDesignerToolbarState();

  useEffect(() => {
    const unregister = registerItem({ id, children, priority });
    return unregister;
  }, [children, priority, registerItem, id]);

  return null;
};
