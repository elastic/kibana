/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, FC, useEffect } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { NoDataViewsComponent } from '@kbn/shared-ux-components';
import { EuiFlyoutBody } from '@elastic/eui';
import { useKibana } from '../../shared_imports';

import { MatchedItem, DataViewEditorContext } from '../../types';

import { getIndices } from '../../lib';

import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { PromptFooter } from './prompt_footer';
import { DEFAULT_ASSETS_TO_IGNORE } from '../../../../data/common';

const removeAliases = (mItem: MatchedItem) => !mItem.item.indices;

interface Props {
  onCancel: () => void;
  allSources: MatchedItem[];
  loadSources: () => void;
}

export function isUserDataIndex(source: MatchedItem) {
  // filter out indices that start with `.`
  if (source.name.startsWith('.')) return false;

  // filter out sources from DEFAULT_ASSETS_TO_IGNORE
  if (source.name === DEFAULT_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE) return false;
  if (source.name === DEFAULT_ASSETS_TO_IGNORE.METRICS_DATA_STREAM_TO_IGNORE) return false;
  if (source.name === DEFAULT_ASSETS_TO_IGNORE.METRICS_ENDPOINT_INDEX_TO_IGNORE) return false;
  if (source.name === DEFAULT_ASSETS_TO_IGNORE.ENT_SEARCH_LOGS_DATA_STREAM_TO_IGNORE) return false;

  // filter out empty sources created by apm server
  if (source.name.startsWith('apm-')) return false;

  return true;
}

export const EmptyPrompts: FC<Props> = ({ allSources, onCancel, children, loadSources }) => {
  const {
    services: { docLinks, application, http, searchClient, dataViews },
  } = useKibana<DataViewEditorContext>();

  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [hasCheckedRemoteClusters, setHasCheckedRemoteClusters] = useState<boolean>(false);

  const [goToForm, setGoToForm] = useState<boolean>(false);

  const hasDataIndices = allSources.some(isUserDataIndex);
  const hasUserIndexPattern = useAsync(() => dataViews.hasUserDataView().catch(() => true));

  useEffect(() => {
    if (!hasDataIndices && !hasCheckedRemoteClusters) {
      setHasCheckedRemoteClusters(true);

      getIndices({
        http,
        isRollupIndex: () => false,
        pattern: '*:*',
        showAllIndices: false,
      }).then((dataSources) => {
        setRemoteClustersExist(!!dataSources.filter(removeAliases).length);
      });
    }
  }, [http, hasDataIndices, searchClient, hasCheckedRemoteClusters]);

  if (hasUserIndexPattern.loading) return null; // return null to prevent UI flickering while loading

  if (!hasUserIndexPattern.value && !goToForm) {
    if (!hasDataIndices && !remoteClustersExist) {
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
      // first time
      return (
        <>
          <EuiFlyoutBody>
            <NoDataViewsComponent
              onClickCreate={() => setGoToForm(true)}
              canCreateNewDataView={application.capabilities.indexPatterns.save as boolean}
              dataViewsDocLink={docLinks.links.indexPatterns.introduction}
              emptyPromptColor={'subdued'}
            />
          </EuiFlyoutBody>
          <PromptFooter onCancel={onCancel} />
        </>
      );
    }
  }

  return <>{children}</>;
};
