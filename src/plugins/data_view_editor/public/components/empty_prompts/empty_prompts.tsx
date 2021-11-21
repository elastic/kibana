/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, FC, useEffect } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { useKibana } from '../../shared_imports';

import { MatchedItem, ResolveIndexResponseItemAlias, DataViewEditorContext } from '../../types';

import { getIndices } from '../../lib';

import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { EmptyIndexPatternPrompt } from './empty_index_pattern_prompt';
import { PromptFooter } from './prompt_footer';
import { FLEET_ASSETS_TO_IGNORE } from '../../../../data/common';

const removeAliases = (item: MatchedItem) =>
  !(item as unknown as ResolveIndexResponseItemAlias).indices;

interface Props {
  onCancel: () => void;
  allSources: MatchedItem[];
  loadSources: () => void;
}

export function isUserDataIndex(source: MatchedItem) {
  // filter out indices that start with `.`
  if (source.name.startsWith('.')) return false;

  // filter out sources from FLEET_ASSETS_TO_IGNORE
  if (source.name === FLEET_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE) return false;
  if (source.name === FLEET_ASSETS_TO_IGNORE.METRICS_DATA_STREAM_TO_IGNORE) return false;
  if (source.name === FLEET_ASSETS_TO_IGNORE.METRICS_ENDPOINT_INDEX_TO_IGNORE) return false;

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
        searchClient,
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
          <EmptyIndexListPrompt
            onRefresh={loadSources}
            closeFlyout={onCancel}
            createAnyway={() => setGoToForm(true)}
            canSaveIndexPattern={application.capabilities.indexPatterns.save as boolean}
            navigateToApp={application.navigateToApp}
            addDataUrl={docLinks.links.indexPatterns.introduction}
          />
          <PromptFooter onCancel={onCancel} />
        </>
      );
    } else {
      // first time
      return (
        <>
          <EmptyIndexPatternPrompt
            goToCreate={() => setGoToForm(true)}
            indexPatternsIntroUrl={docLinks.links.indexPatterns.introduction}
            canSaveIndexPattern={application.capabilities.indexPatterns.save as boolean}
          />
          <PromptFooter onCancel={onCancel} />
        </>
      );
    }
  }

  return <>{children}</>;
};
