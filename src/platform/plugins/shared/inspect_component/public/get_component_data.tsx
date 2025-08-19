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
import type { GetComponentDataOptions } from './types';
import type { InspectComponentResponse } from '../common';
import { flyoutOptions, InspectFlyout } from './inspect';
import { INSPECT_COMPONENT_ROUTE } from '../common/constants';

export const getComponentData = async ({
  core,
  fileInfo,
  setFlyoutRef,
  setIsInspecting,
}: GetComponentDataOptions) => {
  try {
    const { codeowners }: InspectComponentResponse = await core.http.post(INSPECT_COMPONENT_ROUTE, {
      body: JSON.stringify({ path: fileInfo.fileName }),
    });

    const flyout = core.overlays.openFlyout(
      toMountPoint(<InspectFlyout codeowners={codeowners} fileInfo={fileInfo} />, core.rendering),
      flyoutOptions
    );

    setFlyoutRef(flyout);
  } catch (e) {
    return;
  } finally {
    setIsInspecting(false);
  }
};
