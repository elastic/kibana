/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { NoDataViewsComponent } from './no_data_views_component';
import { useEditors, usePermissions } from '../../../services';
import { DataView } from '../../../../../data_views/public';

export interface Props {
  onDataViewCreated: (dataView: DataView) => void;
  dataViewsDocLink: string;
}

/**
 * A service-enabled component that provides Kibana-specific functionality to the `NoDataViews`
 * component.
 *
 * Use of this component requires both the `EuiTheme` context as well as either a configured Shared UX
 * `ServicesProvider` or the `ServicesContext` provided by the Shared UX public plugin contract.
 *
 * See shared-ux/public/services for information.
 */
export const NoDataViewsPage = ({ onDataViewCreated, dataViewsDocLink }: Props) => {
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

  const { canCreateNewDataView } = usePermissions();
  const { openDataViewEditor } = useEditors();
  const createNewDataView = useCallback(() => {
    if (!canCreateNewDataView) {
      return;
    }
    const ref = openDataViewEditor({
      onSave: (dataView) => {
        onDataViewCreated(dataView);
      },
    });
    if (setDataViewEditorRef) {
      setDataViewEditorRef(ref);
    }
  }, [canCreateNewDataView, openDataViewEditor, setDataViewEditorRef, onDataViewCreated]);

  return (
    <NoDataViewsComponent
      onClickCreate={createNewDataView}
      canCreateNewDataView={canCreateNewDataView}
      dataViewsDocLink={dataViewsDocLink}
    />
  );
};
