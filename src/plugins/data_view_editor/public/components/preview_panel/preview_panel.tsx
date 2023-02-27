/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import { StatusMessage } from './status_message';
import { IndicesList } from './indices_list';
import { matchedIndiciesDefault } from '../../data_view_editor_service';

import { MatchedIndicesSet } from '../../types';

enum ViewMode {
  allIndices = 'allIndices',
  onlyMatchingIndices = 'onlyMatchingIndices',
}

const viewModeButtons = [
  {
    id: ViewMode.allIndices,
    label: i18n.translate('indexPatternEditor.previewPanel.viewModeGroup.allSourcesButton', {
      defaultMessage: 'All sources',
    }),
  },
  {
    id: ViewMode.onlyMatchingIndices,
    label: i18n.translate('indexPatternEditor.previewPanel.viewModeGroup.matchingSourcesButton', {
      defaultMessage: 'Matching sources',
    }),
  },
];

interface Props {
  type: INDEX_PATTERN_TYPE;
  allowHidden: boolean;
  title: string;
  matchedIndices$: Observable<MatchedIndicesSet>;
  onUpdateTitle: (title: string) => void;
}

export const PreviewPanel = ({
  type,
  allowHidden,
  title = '',
  matchedIndices$,
  onUpdateTitle,
}: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>();
  const matched = useObservable(matchedIndices$, matchedIndiciesDefault);

  const onUpdateTitleAndViewMode = useCallback(
    (updatedTitle: string) => {
      onUpdateTitle(updatedTitle);
      setViewMode(ViewMode.allIndices); // user prefers to click rather than type
    },
    [onUpdateTitle, setViewMode]
  );

  let currentlyVisibleIndices;
  let currentViewMode;

  if (
    (title.length && !isAboutToIncludeMoreIndices(title) && viewMode !== ViewMode.allIndices) ||
    viewMode === ViewMode.onlyMatchingIndices
  ) {
    currentlyVisibleIndices = matched.visibleIndices;
    currentViewMode = ViewMode.onlyMatchingIndices;
  } else {
    currentlyVisibleIndices = matched.allIndices;
    currentViewMode = ViewMode.allIndices;
  }

  const indicesListContent =
    matched.visibleIndices.length || matched.allIndices.length ? (
      <IndicesList
        data-test-subj="createIndexPatternStep1IndicesList"
        query={title}
        indices={currentlyVisibleIndices}
        onUpdateTitle={onUpdateTitleAndViewMode}
        hasWarnings={
          title.length > 0 &&
          matched.exactMatchedIndices.length === 0 &&
          matched.partialMatchedIndices.length > 0
        }
      />
    ) : (
      <></>
    );

  return (
    <>
      <StatusMessage
        matchedIndices={matched}
        showSystemIndices={type === INDEX_PATTERN_TYPE.ROLLUP ? false : true}
        isIncludingSystemIndices={allowHidden}
        query={title}
      />
      <EuiSpacer size="m" />
      {Boolean(title) && (
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('indexPatternEditor.previewPanel.viewModeGroup.legend', {
            defaultMessage: 'Visible sources',
          })}
          options={viewModeButtons}
          idSelected={currentViewMode}
          onChange={(id: string) => setViewMode(id as ViewMode)}
        />
      )}
      {indicesListContent}
    </>
  );
};

function isAboutToIncludeMoreIndices(query: string) {
  return query.trimEnd().endsWith(',');
}
