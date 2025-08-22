/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { EuiFlyoutBody, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { DataSection } from './data_section';
import { InspectHeader } from './inspect_header';
import { LinksSection } from './links_section';
import type { ComponentData } from '../../types';
import { EUI_PORTAL_ATTRIBUTE } from '../../constants';
import { InspectHighlight } from '../overlay/inspect_highlight';

const setFlyoutZIndex = (flyoutRef: RefObject<HTMLDivElement>, zIndex: string) => {
  setTimeout(() => {
    const node = flyoutRef.current;

    if (node) {
      const portalParent: HTMLElement | null = node.closest(EUI_PORTAL_ATTRIBUTE);

      if (portalParent) portalParent.style.zIndex = zIndex;
    }
  }, 0);
};

interface Props {
  componentData: ComponentData;
  target: HTMLElement | SVGElement;
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  'data-test-subj': 'inspectComponentFlyout',
};

export const InspectFlyout = ({ componentData, target }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [currentPosition, setCurrentPosition] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const flyoutZIndex = (Number(euiTheme.levels.modal) * 2).toString();

  setFlyoutZIndex(ref, flyoutZIndex);

  useEffect(() => {
    if (!target) return;
    const rectangle = target.getBoundingClientRect();
    setCurrentPosition({
      position: 'fixed',
      top: `${rectangle.top}px`,
      left: `${rectangle.left}px`,
      width: `${rectangle.width}px`,
      height: `${rectangle.height}px`,
      zIndex: Number(euiTheme.levels.modal) + 1,
    });
  }, [target, euiTheme.levels.modal]);

  return (
    <>
      <InspectHeader />
      <div ref={ref} />
      <EuiFlyoutBody>
        <DataSection componentData={componentData} />
        <EuiSpacer size="xxl" />
        <LinksSection componentData={componentData} />
      </EuiFlyoutBody>
      {currentPosition &&
        createPortal(<InspectHighlight currentPosition={currentPosition} />, document.body)}
    </>
  );
};
