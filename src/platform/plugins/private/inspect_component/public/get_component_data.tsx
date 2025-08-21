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
import { setElementHighlight } from './utils';
import type { GetComponentDataOptions, InspectComponentResponse } from './types';
import { flyoutOptions, InspectFlyout } from './inspect';

export const getComponentData = async ({
  core,
  fileData,
  iconType,
  target,
  euiTheme,
  setFlyoutRef,
  setIsInspecting,
}: GetComponentDataOptions) => {
  try {
    const { codeowners, relativePath, baseFileName }: InspectComponentResponse =
      await core.http.post('/internal/inspect_component/inspect', {
        body: JSON.stringify({ path: fileData.fileName }),
      });

    const componentData = {
      ...fileData,
      iconType,
      relativePath,
      codeowners,
      baseFileName,
    };

    const flyout = core.overlays.openFlyout(
      toMountPoint(<InspectFlyout componentData={componentData} />, core.rendering),
      flyoutOptions
    );

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
