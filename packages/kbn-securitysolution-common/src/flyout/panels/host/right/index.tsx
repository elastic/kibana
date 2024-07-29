/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  FlyoutBody,
  FlyoutFooter,
  FlyoutHeader,
  FlyoutNavigation,
} from '../../../common/components';
// import { getEntityTableColumns } from './columns';
// import type { BasicEntityData, EntityTableRows } from './types';

interface HostRightPanelProps {
  contextID: string;
  hostName: string;
  scopeId: string;
  isDraggable: false;
}

export const HostRightPanel = (props: HostRightPanelProps) => {
  console.log({ props });
  // const columns = useMemo(() => getEntityTableColumns(), []);
  // const rows = useMemo(() => getEntityTableRows(), []);

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={true} />
      <FlyoutHeader>{'Host Flyout Header'}</FlyoutHeader>
      <FlyoutBody>{'Host Flyout'}</FlyoutBody>
      <FlyoutFooter>{'Host Flyout Footer'}</FlyoutFooter>
    </>
  );
};
