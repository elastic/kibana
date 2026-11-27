/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiPortal,
  EuiSpacer,
  EuiThemeProvider,
  EuiWindowEvent,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { DataSection } from './data_section/data_section';
import { InspectFlyoutHeader } from './inspect_flyout_header';
import { ActionsSection } from './actions_section/actions_section';
import { InspectHighlight } from '../overlay/inspect_highlight';
import { INSPECT_FLYOUT_ID, INSPECT_FLYOUT_MAX_WIDTH } from '../../../lib/constants';
import type { ComponentData } from '../../../lib/get_inspected_element_data';
import type { InspectHostConfig } from '../../../types';

interface Props {
  componentData: ComponentData;
  target: HTMLElement;
  host: InspectHostConfig;
  colorMode: 'light' | 'dark';
  onClose: () => void;
}

/** `container: null` makes it a viewport flyout even when the host sets `componentDefaults.EuiFlyout.container`. */
const flyoutOptions = {
  size: 's',
  'data-test-subj': INSPECT_FLYOUT_ID,
  id: INSPECT_FLYOUT_ID,
  maxWidth: INSPECT_FLYOUT_MAX_WIDTH,
  container: null,
} as const;

/** Rendered by the package rather than a host overlay service, in the given color mode. */
export const InspectFlyout = ({ componentData, target, host, colorMode, onClose }: Props) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'inspectFlyoutTitle' });
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties | null>(null);
  const toastZIndex = Number(euiTheme.levels.toast);

  /**
   * Viewport flyouts (`container={null}`) take their z-index from `levels.mask`
   * (mask sits 2 levels below), so raise it above portal elements.
   */
  const themeModifications = useMemo(() => ({ levels: { mask: toastZIndex + 2 } }), [toastZIndex]);

  const updateHighlightPosition = useCallback(() => {
    const rect = target.getBoundingClientRect();
    setHighlightPosition({
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: toastZIndex + 1,
    });
  }, [target, toastZIndex]);

  /** Set initial highlight position. */
  useLayoutEffect(() => {
    if (!target) return;
    updateHighlightPosition();
  }, [updateHighlightPosition, target]);

  return (
    <EuiThemeProvider colorMode={colorMode} modify={themeModifications}>
      <EuiFlyout {...flyoutOptions} onClose={onClose} aria-labelledby={titleId}>
        <EuiWindowEvent event="resize" handler={updateHighlightPosition} />
        <InspectFlyoutHeader titleId={titleId} />
        <EuiFlyoutBody>
          <DataSection componentData={componentData} getCodeownerHref={host.getCodeownerHref} />
          <EuiSpacer size="xxl" />
          <ActionsSection componentData={componentData} getSourceLinks={host.getSourceLinks} />
        </EuiFlyoutBody>
      </EuiFlyout>
      {highlightPosition && (
        <EuiPortal>
          <InspectHighlight
            currentPosition={highlightPosition}
            path={componentData?.sourceComponent?.type || null}
          />
        </EuiPortal>
      )}
    </EuiThemeProvider>
  );
};
