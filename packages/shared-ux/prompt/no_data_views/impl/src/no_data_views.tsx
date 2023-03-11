/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef } from 'react';

import {
  NoDataViewsPromptServices,
  NoDataViewsPromptProps,
} from '@kbn/shared-ux-prompt-no-data-views-types';

import { NoDataViewsPrompt as NoDataViewsPromptComponent } from './no_data_views.component';
import { useServices } from './services';

type CloseDataViewEditorFn = ReturnType<NoDataViewsPromptServices['openDataViewEditor']>;

/**
 * A service-enabled component that provides Kibana-specific functionality to the `NoDataViewsPrompt`
 * component.
 *
 * Use of this component requires both the `EuiTheme` context as well as a `NoDataViewsPrompt` provider.
 */
export const NoDataViewsPrompt = ({
  onDataViewCreated,
  allowAdHocDataView = false,
}: NoDataViewsPromptProps) => {
  const { canCreateNewDataView, openDataViewEditor, dataViewsDocLink } = useServices();
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
      allowAdHocDataView,
    });

    if (setDataViewEditorRef) {
      setDataViewEditorRef(ref);
    }
  }, [
    canCreateNewDataView,
    openDataViewEditor,
    allowAdHocDataView,
    setDataViewEditorRef,
    onDataViewCreated,
  ]);

  return (
    <NoDataViewsPromptComponent {...{ onClickCreate, canCreateNewDataView, dataViewsDocLink }} />
  );
};
