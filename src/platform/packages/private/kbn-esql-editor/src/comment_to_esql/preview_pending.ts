/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';

/**
 * True while a generated preview is inserted in the editor model. The editor does not
 * publish model changes to the query while it is set, so the preview is never saved.
 */
export type PreviewPendingRef = MutableRefObject<boolean>;

/** Marks the preview as pending before inserting it; clears the mark if the insert throws. */
export const insertPendingPreview = <T>(
  previewPendingRef: PreviewPendingRef | undefined,
  insertPreview: () => T
): T => {
  if (previewPendingRef) previewPendingRef.current = true;
  try {
    return insertPreview();
  } catch (error) {
    if (previewPendingRef) previewPendingRef.current = false;
    throw error;
  }
};
