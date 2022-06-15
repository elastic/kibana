/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, FC, useEffect } from 'react';

import { EuiFlyoutBody } from '@elastic/eui';
import { useKibana } from '../../shared_imports';

import { DataViewEditorContext } from '../../types';

import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { PromptFooter } from './prompt_footer';

interface Props {
  onCancel: () => void;
  loadSources: () => void;
}

interface DataState {
  hasDataView?: boolean;
  hasESData?: boolean;
}

export const EmptyPrompts: FC<Props> = ({ onCancel, children, loadSources }) => {
  const {
    services: { docLinks, application, dataViews },
  } = useKibana<DataViewEditorContext>();

  const [goToForm, setGoToForm] = useState<boolean>(false);
  const [isLoadingDataState, setIsLoadingDataState] = useState<boolean>(true);
  const [dataState, setDataState] = useState<DataState>({});

  const { hasDataView, hasESData } = dataState;

  useEffect(() => {
    (async function () {
      setDataState({
        hasDataView: await dataViews.hasData.hasDataView(),
        hasESData: await dataViews.hasData.hasESData(),
      });
      setIsLoadingDataState(false);
    })();
  }, [dataViews]);

  if (isLoadingDataState) return null; // return null to prevent UI flickering while loading

  if (!hasDataView && !goToForm) {
    if (!hasESData) {
      // load data
      return (
        <>
          <EuiFlyoutBody>
            <EmptyIndexListPrompt
              onRefresh={loadSources}
              closeFlyout={onCancel}
              createAnyway={() => setGoToForm(true)}
              canSaveIndexPattern={!!application.capabilities.indexPatterns.save}
              navigateToApp={application.navigateToApp}
              addDataUrl={docLinks.links.indexPatterns.introduction}
            />
          </EuiFlyoutBody>
          <PromptFooter onCancel={onCancel} />
        </>
      );
    } else {
      return <>{children}</>;
    }
  }

  return <>{children}</>;
};
