/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef } from 'react';

import { DataView } from '../../../../../data_views/public';
import { useEditors, usePermissions } from '../../../services';
import type { SharedUXEditorsService } from '../../../services/editors';

import { NoDataViews as NoDataViewsComponent } from './no_data_views.component';

export interface Props {
  onDataViewCreated: (dataView: DataView) => void;
  dataViewsDocLink: string;
}

type CloseDataViewEditorFn = ReturnType<SharedUXEditorsService['openDataViewEditor']>;

/**
 * A service-enabled component that provides Kibana-specific functionality to the `NoDataViews`
 * component.
 *
 * Use of this component requires both the `EuiTheme` context as well as either a configured Shared UX
 * `ServicesProvider` or the `ServicesContext` provided by the Shared UX public plugin contract.
 *
 * See shared-ux/public/services for information.
 */
export const NoDataViews = ({ onDataViewCreated, dataViewsDocLink }: Props) => {
  const { canCreateNewDataView } = usePermissions();
  const { openDataViewEditor } = useEditors();
  const closeDataViewEditor = useRef<CloseDataViewEditorFn>();

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

  const setDataViewEditorRef = useCallback((ref: CloseDataViewEditorFn) => {
    closeDataViewEditor.current = ref;
  }, []);

  const onClickCreate = useCallback(() => {
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

  return <NoDataViewsComponent {...{ onClickCreate, canCreateNewDataView, dataViewsDocLink }} />;
};
