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
import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
import {
  EuiAccordion,
  EuiFlyoutBody,
  EuiPortal,
  EuiSpacer,
  EuiWindowEvent,
  useEuiTheme,
} from '@elastic/eui';
import { DataSection } from './data_section/data_section';
import { InspectFlyoutHeader } from './inspect_flyout_header';
import { ActionsSection } from './actions_section/actions_section';
import { PropsSection } from './props_section';
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
  core: CoreStart;
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  // ownFocus=false hides the EuiOverlayMask (see EuiFlyout: `hasOverlayMask =
  // ownFocus && !isPushed`) and removes the focus trap, so the rest of the
  // page stays fully interactive while the inspector remains active.
  ownFocus: false,
  // Outside-click is what the inspector itself listens for — it should not
  // also close the flyout, otherwise re-targeting via click would race with
  // dismissal.
  outsideClickCloses: false,
  'data-test-subj': INSPECT_FLYOUT_ID,
  id: INSPECT_FLYOUT_ID,
  maxWidth: INSPECT_FLYOUT_MAX_WIDTH,
  container: null,
};

export const InspectFlyout = ({ componentData, target, branch, core }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties | null>(null);
  const toastZIndex = Number(euiTheme.levels.toast);

  // Monotonic counter that ComponentPreview keys its screenshot capture on.
  // PropsSection bumps it whenever a live-preview override (or a commit) has
  // changed the target component's rendered output.
  const [previewVersion, setPreviewVersion] = useState(0);
  const bumpPreviewVersion = useCallback(() => {
    setPreviewVersion((v) => v + 1);
  }, []);

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

  useLayoutEffect(() => {
    if (!target) return;
    updateHighlightPosition();
  }, [updateHighlightPosition, target]);

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

  const hasExplicitProps = componentData.fileData.explicitProps.length > 0;

  return (
    <>
      <EuiWindowEvent event="resize" handler={updateHighlightPosition} />
      <InspectFlyoutHeader />
      <EuiFlyoutBody>
        <DataSection componentData={componentData} previewVersion={previewVersion} />
        <EuiSpacer size="xxl" />
        <ActionsSection componentData={componentData} branch={branch} />
        <EuiSpacer size="l" />
        <EuiAccordion
          id="inspect-props-accordion"
          buttonContent="Props"
          initialIsOpen={hasExplicitProps}
          paddingSize="s"
        >
          <PropsSection
            target={target}
            fileData={componentData.fileData}
            httpService={core.http}
            notifications={core.notifications}
            onLivePreviewUpdate={bumpPreviewVersion}
          />
        </EuiAccordion>
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
