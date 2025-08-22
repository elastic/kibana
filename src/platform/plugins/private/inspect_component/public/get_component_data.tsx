/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { capturePreviewScreenshot } from './screenshot/capture_screenshot';
import type { GetComponentDataOptions, InspectComponentResponse } from './types';
import { InspectFlyout, flyoutOptions } from './inspect/flyout/inspect_flyout';

export const getComponentData = async ({
  core,
  euiInfo,
  fileData,
  iconType,
  target,
  sourceComponent,
  setFlyoutOverlayRef,
  setIsInspecting,
}: GetComponentDataOptions) => {
  try {
    const { codeowners, relativePath, baseFileName }: InspectComponentResponse =
      await core.http.post('/internal/inspect_component/inspect', {
        body: JSON.stringify({ path: fileData.fileName }),
      });

    const { width: maxWidth, height: maxHeight } = target.getBoundingClientRect();

    // TODO: Screenshot component not target for better looking results
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
      toMountPoint(<InspectFlyout componentData={componentData} target={target} />, core.rendering),
      flyoutOptions
    );

    flyout.onClose.then(() => {
      setFlyoutOverlayRef(undefined);
    });

    setFlyoutOverlayRef(flyout);
  } catch (e) {
    return;
  } finally {
    setIsInspecting(false);
  }
};
