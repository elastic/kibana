/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverlayStart } from '@kbn/core-overlays-browser';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The overlays API.
 * @see {@link OverlayStart}
 * @public
 */
export type IOverlays = OverlayStart;

/**
 * The overlays service for opening flyouts, modals, and banners.
 * @see {@link IOverlays}
 * @public
 */
export const Overlays: ServiceToken<IOverlays> = createToken('Overlays');
