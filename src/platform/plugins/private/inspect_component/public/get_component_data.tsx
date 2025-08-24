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
import { InspectFlyout, flyoutOptions } from './inspect/flyout/inspect_flyout';
import type { ComponentData, GetComponentDataOptions, InspectComponentResponse } from './types';

/**
 * Fetch component data ({@link InspectComponentResponse}) from the server
 * and display it in a flyout ({@link InspectFlyout}).
 */
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

    const componentData: ComponentData = {
      ...fileData,
      baseFileName,
      codeowners,
      euiInfo,
      iconType,
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
