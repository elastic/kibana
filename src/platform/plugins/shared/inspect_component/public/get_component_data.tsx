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
import { INSPECT_COMPONENT_ROUTE } from '../common/constants';
import { InspectFlyout, flyoutOptions } from './inspect';
import type { InspectComponentResponse } from '../common';
import type { GetComponentDataOptions } from './types';

export const getComponentData = async ({
  core,
  path,
  setFlyoutRef,
  setIsInspecting,
}: GetComponentDataOptions) => {
  try {
    const { codeowners, fullPath }: InspectComponentResponse = await core.http.post(
      INSPECT_COMPONENT_ROUTE,
      {
        body: JSON.stringify({ path }),
      }
    );

    const flyout = core.overlays.openFlyout(
      toMountPoint(
        <InspectFlyout codeowners={codeowners} fullPath={fullPath} path={path} />,
        core.rendering
      ),
      flyoutOptions
    );

    setFlyoutRef(flyout);
  } catch (e) {
    return;
  } finally {
    setIsInspecting(false);
  }
};
