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

/** The options for saving a dashboard. */
export type DashboardSavingOption = 'new' | 'existing' | null;

interface SaveModalDashboardBaseProps<SaveResponse = void> {
  /** Information about the document being saved. */
  documentInfo: SaveModalDocumentInfo;
  /** The type of object being saved. */
  objectType: string;
  /** Callback invoked when the modal is closed. */
  onClose: () => void;
  /** Callback invoked when the save action is triggered. */
  onSave: (
    props: OnSaveProps & { dashboardId: string | null; addToLibrary: boolean }
  ) => Promise<SaveResponse>;
  /** Optional tag selector element or render function. */
  tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  /** Message displayed when the user must copy on save. */
  mustCopyOnSaveMessage?: string;
  /** Custom title for the save modal. */
  customModalTitle?: React.ReactNode;
  /** Whether to hide the dashboard destination options. */
  hideDashboardOptions?: boolean;
  /** Whether to always save by reference and hide the add-to-library checkbox. */
  forceSaveByReference?: boolean;
  /** The initially selected dashboard saving option. */
  initialDashboardOption?: DashboardSavingOption;
  /** Callback invoked when the copy-on-save option changes. */
  onCopyOnSaveChangeCb?: (newCopyOnSave: boolean) => void;
}

interface SaveModalDashboardByValueProps<SaveResponse = void>
  extends SaveModalDashboardBaseProps<SaveResponse> {
  /** object can not be saved by reference. */
  canSaveByReference: false;
}

interface SaveModalDashboardByValueAndByReferenceProps<SaveResponse = void>
  extends SaveModalDashboardBaseProps<SaveResponse> {
  /** object can be saved by reference. */
  canSaveByReference: true;
  hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
  lastSavedTitle: string;
}

/** Props for the save modal with dashboard options. */
export type SaveModalDashboardProps<SaveResponse = void> =
  | SaveModalDashboardByValueProps<SaveResponse>
  | SaveModalDashboardByValueAndByReferenceProps<SaveResponse>;
