/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlsPluginStartDeps } from '../../types';
import { ControlsOverlaysService } from '../overlays';
import { KibanaPluginServiceFactory } from '../../../../presentation_util/public';

export type OverlaysServiceFactory = KibanaPluginServiceFactory<
  ControlsOverlaysService,
  ControlsPluginStartDeps
>;
export const overlaysServiceFactory: OverlaysServiceFactory = ({ coreStart }) => {
  const {
    overlays: { openFlyout, openConfirm },
  } = coreStart;

  return {
    openFlyout,
    openConfirm,
  };
};
