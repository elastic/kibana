/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC } from 'react';
import { usePanel } from './context';

export const NavigationPanel: FC = () => {
  const { isOpen } = usePanel();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'yellow',
        position: 'absolute',
        top: 0,
        left: '100%',
        height: '100%',
      }}
    >
      PANEL
    </div>
  );
};
