/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';

export interface DataViewLandingEditorOpenerProps {
  onClose: () => void;
  openEditor: DataViewEditorStart['openEditor'];
}

/**
 * Mounts on the Stack Management landing page and opens the data view editor flyout
 * (via overlay service) so users need not navigate away for the quick action.
 */
export function DataViewLandingEditorOpener({
  onClose,
  openEditor,
}: DataViewLandingEditorOpenerProps) {
  useEffect(() => {
    const closeEditor = openEditor({
      onSave: (_dataView: DataView) => {
        onClose();
      },
      onCancel: onClose,
    });
    return () => {
      closeEditor();
    };
  }, [onClose, openEditor]);

  return null;
}
