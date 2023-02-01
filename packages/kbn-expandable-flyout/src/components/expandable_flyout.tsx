/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlyout } from '@elastic/eui';
import { FlyoutLayout } from '../models/layout';
import { PreviewSection } from './preview_section';
import { RightSection } from './right_section';
import type { FlyoutPanel } from '../models/panel';
import { LeftSection } from './left_section';

interface Panel {
  /**
   * Unique key used to identify the panel
   */
  key?: string;
  /**
   * Component to be rendered
   */
  component: (props: FlyoutPanel) => React.ReactElement; // TODO: generalize FlyoutPanel to allow it to work in any solution
  /**
   * Width used when rendering the panel
   */
  width: number; // TODO remove this, the width shouldn't be a property of a panel, but handled at the flyout level
}

export interface ExpandableFlyoutProps extends EuiFlyoutProps {
  /**
   * Right, left and preview panels to render
   */
  layout: FlyoutLayout;
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   * Scope
   */
  scope: string;
}

export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({
  layout,
  registeredPanels,
  scope,
  ...flyoutProps
}) => {
  const { left, right, preview } = layout;

  const leftSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === left?.id),
    [left, registeredPanels]
  );

  const rightSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === right?.id),
    [right, registeredPanels]
  );

  // retrieve the last preview panel (most recent)
  const mostRecentPreview = preview ? preview[preview.length - 1] : undefined;
  const showBackButton = preview.length > 1;
  const previewSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === mostRecentPreview?.id),
    [mostRecentPreview, registeredPanels]
  );

  const width: number = (leftSection?.width ?? 0) + (rightSection?.width ?? 0);

  return (
    <EuiFlyout
      css={css`
        overflow-y: scroll;
      `}
      {...flyoutProps}
      size={width}
      ownFocus={false}
    >
      <EuiFlexGroup
        direction={leftSection ? 'row' : 'column'}
        wrap={false}
        gutterSize="none"
        style={{ height: '100%' }}
      >
        {leftSection && left ? (
          <LeftSection
            component={leftSection.component({ ...(left as FlyoutPanel) })}
            width={leftSection.width}
          />
        ) : null}
        {rightSection && right ? (
          <RightSection
            component={rightSection.component({ ...(right as FlyoutPanel) })}
            width={rightSection.width}
          />
        ) : null}
      </EuiFlexGroup>

      {previewSection && preview ? (
        <PreviewSection
          component={previewSection.component({ ...(mostRecentPreview as FlyoutPanel) })}
          showBackButton={showBackButton}
          width={leftSection?.width}
          scope={scope}
        />
      ) : null}
    </EuiFlyout>
  );
};

ExpandableFlyout.displayName = 'ExpandableFlyout';
