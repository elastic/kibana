/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { NoDataViewsComponent } from './no_data_views_component';
import { useServices } from '../../../services';
import { DataView } from '../../../../../data_views/public';

export interface NoDataViewsPageProps {
  onDataViewCreated: (dataView: DataView) => void;
}

export const NoDataViewsPage = (props: NoDataViewsPageProps) => {
  const { onDataViewCreated } = props;
  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    const cleanup = () => {
      if (closeDataViewEditor?.current) {
        closeDataViewEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

  const setDataViewEditorRef = useCallback((ref: () => void | undefined) => {
    closeDataViewEditor.current = ref;
  }, []);

  const { dataViewEditor } = useServices();
  const canCreateNewDataView = dataViewEditor.userPermissions.editDataView();
  const createNewDataView = useCallback(() => {
    if (!canCreateNewDataView) {
      return;
    }
    const ref = dataViewEditor.openEditor({
      onSave: (dataView) => {
        onDataViewCreated(dataView);
      },
    });
    if (setDataViewEditorRef) {
      setDataViewEditorRef(ref);
    }
  }, [canCreateNewDataView, dataViewEditor, setDataViewEditorRef, onDataViewCreated]);

  return (
    <NoDataViewsComponent onClick={createNewDataView} canCreateNewDataView={canCreateNewDataView} />
  );
};
