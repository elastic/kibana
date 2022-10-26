/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback } from 'react';
import { useServices } from './services';

import { InspectorLoader } from './components';
export interface OpenInspectorParams {
  title: string;
  description?: string;
  onSave(args: { title: string; desciption?: string }): Promise<void>;
}

export function useOpenInspector() {
  const { openFlyout } = useServices();

  return useCallback(
    (args: OpenInspectorParams) => {
      openFlyout(<InspectorLoader />, {
        maxWidth: 708,
        size: 'l',
        ownFocus: true,
        hideCloseButton: true,
      });
    },
    [openFlyout]
  );
}
