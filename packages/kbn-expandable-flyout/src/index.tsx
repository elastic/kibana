/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlyout } from '@elastic/eui';
import { useExpandableFlyoutContext } from './context';
import { PreviewSection } from './components/preview_section';
import { RightSection } from './components/right_section';
import type { FlyoutPanel, Panel } from './types';
import { LeftSection } from './components/left_section';

export interface ExpandableFlyoutProps extends EuiFlyoutProps {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   * Propagate out EuiFlyout onClose event
   */
  handleOnFlyoutClosed?: () => void;
}

/**
 * Expandable flyout UI React component.
 * Displays 3 sections (right, left, preview) depending on the panels in the context.
 */
export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({
  registeredPanels,
  handleOnFlyoutClosed,
  ...flyoutProps
}) => {
  const { panels, closeFlyout } = useExpandableFlyoutContext();
  const { left, right, preview } = panels;

  const onClose = useCallback(() => {
    if (handleOnFlyoutClosed) handleOnFlyoutClosed();
    closeFlyout();
  }, [closeFlyout, handleOnFlyoutClosed]);

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
  const showBackButton = preview && preview.length > 1;
  const previewSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === mostRecentPreview?.id),
    [mostRecentPreview, registeredPanels]
  );

  // do not add the flyout to the dom if there aren't any panels to display
  if (!left && !right && !preview.length) {
    return <></>;
  }

  const width: number = (leftSection?.width ?? 0) + (rightSection?.width ?? 0);

  return (
    <EuiFlyout
      css={css`
        overflow-y: scroll;
      `}
      {...flyoutProps}
      size={width}
      ownFocus={false}
      onClose={onClose}
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
        />
      ) : null}
    </EuiFlyout>
  );
};

ExpandableFlyout.displayName = 'ExpandableFlyout';
