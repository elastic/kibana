/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import { PresentationOverlaysService } from '../overlays';

export type OverlaysServiceFactory = KibanaPluginServiceFactory<
  PresentationOverlaysService,
  PresentationUtilPluginStartDeps
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
