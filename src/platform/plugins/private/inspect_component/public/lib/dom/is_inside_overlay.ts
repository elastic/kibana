/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INSPECT_OVERLAY_ID } from '../constants';

/** Checks whether the target is the inspect overlay itself or one of its descendants, e.g. the highlight box. */
export const isInsideOverlay = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(`#${INSPECT_OVERLAY_ID}`) !== null;
