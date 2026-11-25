/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRenderedWithin } from '@kbn/react-fiber';
import { DEVELOPER_TOOLBAR_ID } from '../constants';

/**
 * Checks whether the target belongs to the developer toolbar: the toolbar itself, a descendant such
 * as a mode button, or a control it renders through a portal such as the settings modal.
 */
export const isInsideDeveloperToolbar = (target: EventTarget | null): boolean => {
  const toolbar = document.getElementById(DEVELOPER_TOOLBAR_ID);

  return target instanceof Element && toolbar !== null && isRenderedWithin(target, toolbar);
};
