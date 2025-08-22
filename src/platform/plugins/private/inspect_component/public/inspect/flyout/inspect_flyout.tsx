/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { EuiFlyoutBody, EuiPortal, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { DataSection } from './data_section/data_section';
import { InspectFlyoutHeader } from './inspect_flyout_header';
import { ActionsSection } from './actions_section/actions_section';
import { EUI_PORTAL_ATTRIBUTE, INSPECT_FLYOUT_ID } from '../../constants';
import { InspectHighlight } from '../overlay/inspect_highlight';
import type { ComponentData } from '../../types';

interface Props {
  componentData: ComponentData;
  target: HTMLElement | SVGElement;
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  'data-test-subj': INSPECT_FLYOUT_ID,
  id: INSPECT_FLYOUT_ID,
  maxWidth: 480,
};

export const InspectFlyout = ({ componentData, target }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [currentPosition, setCurrentPosition] = useState<CSSProperties | null>(null);
  const modalZIndex = Number(euiTheme.levels.modal);

  requestAnimationFrame(() => {
    const flyoutElement = document.getElementById(INSPECT_FLYOUT_ID);
    const portalParent = flyoutElement?.closest(EUI_PORTAL_ATTRIBUTE);
    if (portalParent instanceof HTMLElement) {
      portalParent.style.zIndex = (modalZIndex + 2).toString();
    }
  });

  useEffect(() => {
    if (!target) return;
    const rectangle = target.getBoundingClientRect();
    // TODO: Handle resizing
    setCurrentPosition({
      position: 'fixed',
      top: `${rectangle.top}px`,
      left: `${rectangle.left}px`,
      width: `${rectangle.width}px`,
      height: `${rectangle.height}px`,
      zIndex: modalZIndex + 1,
    });
  }, [target, modalZIndex]);

  return (
    <>
      <InspectFlyoutHeader />
      <EuiFlyoutBody>
        <DataSection componentData={componentData} />
        <EuiSpacer size="xxl" />
        <ActionsSection componentData={componentData} />
      </EuiFlyoutBody>
      {currentPosition && (
        <EuiPortal>
          <InspectHighlight currentPosition={currentPosition} />
        </EuiPortal>
      )}
    </>
  );
};
