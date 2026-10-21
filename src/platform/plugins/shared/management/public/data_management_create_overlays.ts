/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataManagementCreateOverlayId, DataManagementCreateOverlayRenderer } from './types';

const renderers = new Map<DataManagementCreateOverlayId, DataManagementCreateOverlayRenderer>();

/** Registers a create UI that the data management overview opens in place. */
export const registerDataManagementCreateOverlay = (
  id: DataManagementCreateOverlayId,
  render: DataManagementCreateOverlayRenderer
) => {
  renderers.set(id, render);
};

/** Returns the create UI registered for a resource type, when its plugin is available. */
export const getDataManagementCreateOverlay = (
  id: DataManagementCreateOverlayId
): DataManagementCreateOverlayRenderer | undefined => renderers.get(id);
