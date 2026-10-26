/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFlyout } from '@elastic/eui';
import { DataViewEditorLazy } from './data_view_editor_lazy';
import type { DataViewEditorContext, DataViewEditorProps } from '../types';
import { createKibanaReactContext } from '../shared_imports';

export interface DataViewEditorPropsWithServices extends DataViewEditorProps {
  services: DataViewEditorContext;
}

export const DataViewEditor = ({
  onSave,
  onCancel = () => {},
  services,
  defaultTypeIsRollup = false,
  requireTimestampField = false,
  editData,
  allowAdHocDataView,
  onDuplicate,
  isDuplicating,
  getDataViewHelpText,
}: DataViewEditorPropsWithServices) => {
  // `createKibanaReactContext` returns a new Provider component type on every call, so it has to be
  // memoized, otherwise every re-render remounts the flyout and resets the form to its defaults.
  const { Provider: KibanaReactContextProvider } = useMemo(
    () => createKibanaReactContext<DataViewEditorContext>(services),
    [services]
  );

  return (
    <KibanaReactContextProvider>
      <EuiFlyout
        onClose={() => {}}
        hideCloseButton={true}
        size="l"
        aria-labelledby="dataViewEditorFlyoutTitle"
      >
        <DataViewEditorLazy
          onSave={onSave}
          onCancel={onCancel}
          defaultTypeIsRollup={defaultTypeIsRollup}
          requireTimestampField={requireTimestampField}
          editData={editData}
          allowAdHocDataView={allowAdHocDataView}
          onDuplicate={onDuplicate}
          isDuplicating={isDuplicating}
          getDataViewHelpText={getDataViewHelpText}
        />
      </EuiFlyout>
    </KibanaReactContextProvider>
  );
};
