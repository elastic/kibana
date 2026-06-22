/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import type { SidePanelNestedPanelRenderProps } from '@kbn/core-chrome-browser';

import { useNestedMenu } from './nested_secondary_menu/use_nested_menu';

export interface NestedPanelContentProps {
  panelId: string;
  renderNestedPanel?: (
    panelId: string,
    options?: Pick<SidePanelNestedPanelRenderProps, 'onGoBack'>
  ) => ReactNode;
}

export const NestedPanelContent = ({
  panelId,
  renderNestedPanel,
}: NestedPanelContentProps): JSX.Element | null => {
  const { goBack } = useNestedMenu();

  return <>{renderNestedPanel?.(panelId, { onGoBack: goBack })}</>;
};
