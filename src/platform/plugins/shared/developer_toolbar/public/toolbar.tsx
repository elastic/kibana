/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
import React, { useCallback } from 'react';
import type { Observable } from 'rxjs';
import type { DeveloperToolbarProps } from '@kbn/developer-toolbar';
import {
  DeveloperToolbar,
  DeveloperToolbarAction,
  DeveloperToolbarProvider,
} from '@kbn/developer-toolbar';
import useObservable from 'react-use/lib/useObservable';

export interface DeveloperToolbarAction {
  id: string;
  priority: number;
  tooltip?: string;
  children: React.ReactNode;
}

export const Toolbar = ({
  actions$,
  envInfo,
}: {
  actions$: Observable<DeveloperToolbarAction[]>;
  envInfo: DeveloperToolbarProps['envInfo'];
}) => {
  const updateLayout = useLayoutUpdate();
  const registeredActions = useObservable(actions$, []);

  const onHeightChange = useCallback(
    (height: number) => {
      updateLayout({
        footerHeight: height,
      });
    },
    [updateLayout]
  );

  const sortedActions = registeredActions
    .slice()
    .sort((a: DeveloperToolbarAction, b: DeveloperToolbarAction) => b.priority - a.priority);

  return (
    <DeveloperToolbarProvider>
      <DeveloperToolbar position="static" envInfo={envInfo} onHeightChange={onHeightChange} />
      {sortedActions.map((action: DeveloperToolbarAction) => (
        <DeveloperToolbarAction
          key={action.id}
          id={action.id}
          priority={action.priority}
          tooltip={action.tooltip}
        >
          {action.children}
        </DeveloperToolbarAction>
      ))}
    </DeveloperToolbarProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default Toolbar;
