/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, FC } from 'react';

import { useKibana } from '../../shared_imports';

import { MatchedItem, ResolveIndexResponseItemAlias, IndexPatternEditorContext } from '../../types';

import { getIndices } from '../../lib';

import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { EmptyIndexPatternPrompt } from './empty_index_pattern_prompt';
import { PromptFooter } from './prompt_footer';

const removeAliases = (item: MatchedItem) =>
  !((item as unknown) as ResolveIndexResponseItemAlias).indices;

interface Props {
  onCancel: () => void;
  allSources: MatchedItem[];
  hasExistingIndexPatterns: boolean;
  loadSources: () => void;
}

export const EmptyPrompts: FC<Props> = ({
  hasExistingIndexPatterns,
  allSources,
  onCancel,
  children,
  loadSources,
}) => {
  const {
    services: { docLinks, application, http },
  } = useKibana<IndexPatternEditorContext>();

  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [goToForm, setGoToForm] = useState<boolean>(false);

  const hasDataIndices = allSources.some(({ name }: MatchedItem) => !name.startsWith('.'));

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

  if (!hasExistingIndexPatterns && !goToForm) {
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
