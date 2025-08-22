/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import type { RefObject } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { capturePreviewScreenshot } from './screenshot/capture_screenshot';
import { setElementHighlight } from './utils';
import type { GetComponentDataOptions, InspectComponentResponse } from './types';
import { flyoutOptions, InspectFlyout } from './inspect';

const setFlyoutZIndex = (flyoutRef: RefObject<HTMLDivElement>, zIndex: string) => {
  setTimeout(() => {
    const node = flyoutRef.current;

    if (node) {
      const portalParent: HTMLElement | null = node.closest('[data-euiportal="true"]');

      if (portalParent) portalParent.style.zIndex = zIndex;
    }
  }, 0);
};

export const getComponentData = async ({
  core,
  euiInfo,
  fileData,
  iconType,
  target,
  euiTheme,
  sourceComponent,
  setFlyoutRef,
  setIsInspecting,
}: GetComponentDataOptions) => {
  try {
    const flyoutRef = createRef<HTMLDivElement>();

    const { codeowners, relativePath, baseFileName }: InspectComponentResponse =
      await core.http.post('/internal/inspect_component/inspect', {
        body: JSON.stringify({ path: fileData.fileName }),
      });

    const { width: maxWidth, height: maxHeight } = target.getBoundingClientRect();

    const image = await capturePreviewScreenshot({
      target,
      maxWidth,
      maxHeight,
      aspectRatio: maxHeight / maxWidth,
    });

    const componentData = {
      ...fileData,
      baseFileName,
      codeowners,
      euiInfo,
      iconType,
      image,
      relativePath,
      sourceComponent,
    };

    const flyout = core.overlays.openFlyout(
      toMountPoint(<InspectFlyout componentData={componentData} ref={flyoutRef} />, core.rendering),
      flyoutOptions
    );

    const flyoutZIndex = (Number(euiTheme.levels.modal) * 2).toString();
    setFlyoutZIndex(flyoutRef, flyoutZIndex);

    const restore = setElementHighlight({
      target,
      euiTheme,
    });

    flyout.onClose.then(() => {
      restore();
      setFlyoutRef(undefined);
    });

    setFlyoutRef(flyout);
  } catch (e) {
    return;
  } finally {
    setIsInspecting(false);
  }
};
