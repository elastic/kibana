/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import { StatusMessage } from './status_message';
import { IndicesList } from './indices_list';
import { matchedIndiciesDefault } from '../../data_view_editor_service';

import { MatchedIndicesSet } from '../../types';

interface Props {
  type: INDEX_PATTERN_TYPE;
  allowHidden: boolean;
  title: string;
  matchedIndices$: Observable<MatchedIndicesSet>;
}

export const PreviewPanel = ({ type, allowHidden, title = '', matchedIndices$ }: Props) => {
  const matched = useObservable(matchedIndices$, matchedIndiciesDefault);
  const indicesListContent =
    matched.visibleIndices.length || matched.allIndices.length ? (
      <>
        <EuiSpacer />
        <IndicesList
          data-test-subj="createIndexPatternStep1IndicesList"
          query={title}
          indices={title.length ? matched.visibleIndices : matched.allIndices}
        />
      </>
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
      {indicesListContent}
    </>
  );
};
