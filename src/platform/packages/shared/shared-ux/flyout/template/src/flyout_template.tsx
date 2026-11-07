/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useId, useMemo } from 'react';
import { EuiFlyout, useGeneratedHtmlId } from '@elastic/eui';
import type { FlyoutTemplateProps } from './types';
import { FlyoutTemplateConfigProvider } from './context';
import { useFlyoutTemplateFrame } from './context/frame_context';
import {
  FlyoutTemplateDeclaration,
  FlyoutTemplateZonesView,
  useFlyoutTemplateZones,
} from './declaration';
import { FlyoutTemplateFrame } from './frame';
import { Body } from './body/body';
import { Header } from './header/header';
import { Footer } from './footer/footer';

/** A `FlyoutTemplate` with no frame above it: it renders its own `EuiFlyout` around its zones. */
const FlyoutTemplateStandalone = ({
  children,
  size = 'm',
  session = 'start',
  flyoutMenuProps,
  tabs,
  tabBarProps,
  defaultSelectedTabId,
  selectedTabId,
  onTabChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'data-test-subj': dataTestSubj,
  ...euiFlyoutProps
}: FlyoutTemplateProps) => {
  const htmlIdSuffix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const flyoutTitleId = useGeneratedHtmlId({ prefix: `flyoutTemplateTitle${htmlIdSuffix}` });
  const zones = useFlyoutTemplateZones(children);
  const config = useMemo(() => ({ dataTestSubj }), [dataTestSubj]);

  const menuTitle = zones.header?.title;
  const menuTitleString =
    zones.header?.titleText ?? (typeof menuTitle === 'string' ? menuTitle : undefined);
  const flyoutAriaLabelledBy =
    ariaLabelledBy ?? (!ariaLabel && zones.header ? flyoutTitleId : undefined);
  const flyoutAriaLabel = flyoutAriaLabelledBy ? undefined : ariaLabel ?? menuTitleString;

  // Feed the title text to EUI's flyout menu for history/navigation. Without it EUI falls back to a
  // placeholder title, so a header whose title is a node needs `titleText` to be named there.
  const mergedMenuProps = {
    ...(menuTitleString !== undefined ? { title: menuTitleString } : {}),
    ...flyoutMenuProps,
  };
  const hasMenuProps = Object.keys(mergedMenuProps).length > 0;

  return (
    <EuiFlyout
      {...euiFlyoutProps}
      size={size}
      session={session}
      paddingSize="m"
      data-test-subj={dataTestSubj}
      flyoutMenuDisplayMode="auto"
      flyoutMenuProps={hasMenuProps ? mergedMenuProps : undefined}
      aria-label={flyoutAriaLabel}
      aria-labelledby={flyoutAriaLabelledBy}
    >
      <FlyoutTemplateConfigProvider value={config}>
        <FlyoutTemplateZonesView
          zones={zones}
          flyoutTitleId={flyoutTitleId}
          tabs={tabs}
          tabBarProps={tabBarProps}
          defaultSelectedTabId={defaultSelectedTabId}
          selectedTabId={selectedTabId}
          onTabChange={onTabChange}
        />
      </FlyoutTemplateConfigProvider>
    </EuiFlyout>
  );
};

/**
 * Root component. Inside a frame (`FlyoutTemplate.Frame`, or the one a managing opener renders)
 * it is a declaration: it renders its zones into the frame's flyout and takes only `children`,
 * `onClose`, and the tab props. Anywhere else it renders its own flyout.
 */
const FlyoutTemplateRoot = (props: FlyoutTemplateProps) => {
  const frame = useFlyoutTemplateFrame();
  if (frame) {
    return <FlyoutTemplateDeclaration frame={frame} props={props} />;
  }
  return <FlyoutTemplateStandalone {...props} />;
};

/** `FlyoutTemplate` with its declarative zones and its frame attached as compound namespaces. */
export const FlyoutTemplate = Object.assign(FlyoutTemplateRoot, {
  Header,
  Body,
  Footer,
  Frame: FlyoutTemplateFrame,
});
