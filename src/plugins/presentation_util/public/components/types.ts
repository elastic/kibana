/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OnSaveProps, SaveModalState } from '../../../../plugins/saved_objects/public';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

export interface SaveModalDashboardProps {
  documentInfo: SaveModalDocumentInfo;
  canSaveByReference: boolean;
  objectType: string;
  onClose: () => void;
  onSave: (props: OnSaveProps & { dashboardId: string | null; addToLibrary: boolean }) => void;
  tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
}
