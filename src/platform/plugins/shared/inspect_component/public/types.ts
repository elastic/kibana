/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, OverlayRef } from '@kbn/core/public';
import type { Dispatch, SetStateAction } from 'react';

export interface GetElementFromPointOptions {
  event: PointerEvent;
}

export interface GetComponentDataOptions {
  core: CoreStart;
  path: string;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export type GetInspectedElementOptions = Omit<
  GetElementFromPointOptions & GetComponentDataOptions,
  'path'
>;
