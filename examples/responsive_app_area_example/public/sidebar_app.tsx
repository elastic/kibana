/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText, useCurrentEuiBreakpoint } from '@elastic/eui';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarBody, SidebarHeader, useSidebarApp } from '@kbn/core-chrome-sidebar-components';

export const sidebarAppId = 'sidebarExampleResponsiveAppArea';

export const useResponsiveSidebarApp = () => useSidebarApp(sidebarAppId);

export function SidebarApp({ onClose }: SidebarComponentProps) {
  const breakpoint = useCurrentEuiBreakpoint();

  return (
    <>
      <SidebarHeader title="Sidebar" onClose={onClose} />
      <SidebarBody>
        <EuiText size="s">
          <p>
            Opening the sidebar narrows the app area. Resize it by dragging its edge and watch the
            app react.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut size="s" title={`EUI breakpoint here: ${breakpoint}`} iconType="info">
          The sidebar is outside the app area, so it keeps using the window.
        </EuiCallOut>
      </SidebarBody>
    </>
  );
}
