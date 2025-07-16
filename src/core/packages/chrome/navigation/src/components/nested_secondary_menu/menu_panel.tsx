/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, ReactNode } from 'react';

import { SecondaryMenu } from '../secondary_menu';
import { useNestedMenu } from '../../hooks/use_nested_menu';

export interface PanelProps {
  children: ReactNode;
  id: string;
  title?: string;
}

export const Panel: FC<PanelProps> = ({ children, id, title }) => {
  const { currentPanel } = useNestedMenu();

  if (currentPanel !== id) {
    return null;
  }

  if (title) {
    return (
      <SecondaryMenu title={title} isPanel={false}>
        {children}
      </SecondaryMenu>
    );
  }

  return <div>{children}</div>;
};
