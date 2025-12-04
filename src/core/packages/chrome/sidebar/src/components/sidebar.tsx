/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SidebarPanel } from './sidebar_panel';
import { useSidebar } from './use_sidebar';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SidebarProps {}

export function Sidebar(props: SidebarProps) {
  const { close } = useSidebar();

  return (
    <SidebarPanel title={'Sidebar App Title'} onClose={close}>
      Sidebar Content
    </SidebarPanel>
  );
}
