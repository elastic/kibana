/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter } from 'rxjs/operators';
import { ISearchSource } from '../../../../kibana_services';
import { Adapters } from '../../../../../../inspector/common';
import { isCompleteResponse } from '../../../../../../data/common';

export const fetchDocuments = ({
  abortController,
  inspectorAdapters,
  searchSessionId,
  searchSource,
}: {
  abortController: AbortController;
  inspectorAdapters: Adapters;
  searchSessionId: string;
  searchSource: ISearchSource;
}) => {
  const childSearchSource = searchSource.createCopy();
  childSearchSource.setField('trackTotalHits', false);

  return childSearchSource
    .fetch$({
      abortSignal: abortController.signal,
      sessionId: searchSessionId,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('discover.inspectorRequestDataTitleDocuments', {
          defaultMessage: 'documents data',
        }),
        description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the documents for the search.',
        }),
      },
    })
    .pipe(filter((res) => isCompleteResponse(res)));
};
