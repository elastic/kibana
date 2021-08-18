/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, FC } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { useKibana } from '../../shared_imports';

import { MatchedItem, ResolveIndexResponseItemAlias, IndexPatternEditorContext } from '../../types';

import { getIndices } from '../../lib';

import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { EmptyIndexPatternPrompt } from './empty_index_pattern_prompt';
import { PromptFooter } from './prompt_footer';
import { KNOWN_FLEET_ASSETS } from '../../../../data/common';

const removeAliases = (item: MatchedItem) =>
  !((item as unknown) as ResolveIndexResponseItemAlias).indices;

interface Props {
  onCancel: () => void;
  allSources: MatchedItem[];
  loadSources: () => void;
}

export function isDataIndex(source: MatchedItem) {
  // filter out indexes that start with `.`
  if (source.name.startsWith('.')) return false;

  // filter out indexes that backed up only by indexes from KNOWN_FLEET_ASSETS.INDEX_PREFIXES_TO_IGNORE
  const onlyFleetServerIndexes = source.item.backing_indices?.every((index) =>
    KNOWN_FLEET_ASSETS.INDEX_PREFIXES_TO_IGNORE.some((ignorePrefix) =>
      index.startsWith(ignorePrefix)
    )
  );
  if (onlyFleetServerIndexes) return false;

  return true;
}

export const EmptyPrompts: FC<Props> = ({ allSources, onCancel, children, loadSources }) => {
  const {
    services: { docLinks, application, http, indexPatternService },
  } = useKibana<IndexPatternEditorContext>();

  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [goToForm, setGoToForm] = useState<boolean>(false);

  const hasDataIndices = allSources.some(isDataIndex);
  const hasExistingIndexPatternsWithUserData = useAsync(() =>
    indexPatternService.hasIndexPatternWithUserData()
  );

  useCallback(() => {
    let isMounted = true;
    if (!hasDataIndices)
      getIndices(http, () => false, '*:*', false).then((dataSources) => {
        if (isMounted) {
          setRemoteClustersExist(!!dataSources.filter(removeAliases).length);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [http, hasDataIndices]);

  if (hasExistingIndexPatternsWithUserData.loading) return null; // return null to prevent UI flickering while loading

  if (!hasExistingIndexPatternsWithUserData.value && !goToForm) {
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
