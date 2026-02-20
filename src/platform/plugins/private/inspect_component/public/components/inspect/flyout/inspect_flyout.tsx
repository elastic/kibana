/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { EuiFlyoutBody, EuiPortal, EuiSpacer, EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { DataSection } from './data_section/data_section';
import { InspectFlyoutHeader } from './inspect_flyout_header';
import { ActionsSection } from './actions_section/actions_section';
import { InspectHighlight } from '../overlay/inspect_highlight';
import {
  EUI_PORTAL_ATTRIBUTE,
  INSPECT_FLYOUT_ID,
  INSPECT_FLYOUT_MAX_WIDTH,
} from '../../../lib/constants';
import type { ComponentData } from '../../../lib/get_inspected_element_data';

interface Props {
  componentData: ComponentData;
  target: HTMLElement;
  branch: string;
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  'data-test-subj': INSPECT_FLYOUT_ID,
  id: INSPECT_FLYOUT_ID,
  maxWidth: INSPECT_FLYOUT_MAX_WIDTH,
  maskProps: {
    headerZindexLocation: 'above',
  },
};

export const InspectFlyout = ({ componentData, target, branch }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties | null>(null);
  const toastZIndex = Number(euiTheme.levels.toast);

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

  /** Update z-index of the flyout to be above portal elements. */
  useLayoutEffect(() => {
    const flyoutElement = document.getElementById(INSPECT_FLYOUT_ID);
    const portalParent = flyoutElement?.closest(EUI_PORTAL_ATTRIBUTE);

    if (portalParent instanceof HTMLElement && flyoutElement instanceof HTMLElement) {
      requestAnimationFrame(() => {
        portalParent.style.zIndex = (toastZIndex + 2).toString();
        flyoutElement.style.zIndex = (toastZIndex + 2).toString();
      });
    }
  }, [toastZIndex]);

  return (
    <>
      <EuiWindowEvent event="resize" handler={updateHighlightPosition} />
      <InspectFlyoutHeader />
      <EuiFlyoutBody>
        <DataSection componentData={componentData} />
        <EuiSpacer size="xxl" />
        <ActionsSection componentData={componentData} branch={branch} />
      </EuiFlyoutBody>
      {highlightPosition && (
        <EuiPortal>
          <InspectHighlight
            currentPosition={highlightPosition}
            path={componentData?.sourceComponent?.type || null}
          />
        </EuiPortal>
      )}
    </>
  );
};
