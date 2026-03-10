/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnSaveProps, SaveModalState } from '@kbn/saved-objects-plugin/public';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

export interface SaveModalDashboardProps<T = void> {
  documentInfo: SaveModalDocumentInfo;
  canSaveByReference: boolean;
  objectType: string;
  onClose: () => void;
  onSave: (
    props: OnSaveProps & { dashboardId: string | null; addToLibrary: boolean }
  ) => Promise<T>;
  tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  // include a message if the user has to copy on save
  mustCopyOnSaveMessage?: string;
}
