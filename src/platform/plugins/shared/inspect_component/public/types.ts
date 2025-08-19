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

export interface FileData {
  columnNumber: number;
  lineNumber: number;
  fileName: string;
}

export interface ComponentData extends FileData {
  icon?: string;
  relativePath?: string;
}

export interface ReactFiberNode {
  _debugSource?: FileData;
  _debugOwner?: ReactFiberNode | null;
}

export interface GetComponentDataOptions {
  core: CoreStart;
  fileData: FileData;
  icon?: string;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export interface GetInspectedElementOptions {
  event: PointerEvent;
  core: CoreStart;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}
