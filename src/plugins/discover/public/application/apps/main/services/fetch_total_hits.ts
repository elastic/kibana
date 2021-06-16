/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart, SearchSource } from '../../../../../../data/public';
import { Adapters } from '../../../../../../inspector/common';

export function fetchTotalHits({
  abortController,
  data,
  inspectorAdapters,
  searchSessionId,
  searchSource,
}: {
  abortController: AbortController;
  data: DataPublicPluginStart;
  inspectorAdapters: Adapters;
  searchSessionId: string;
  searchSource: SearchSource;
}) {
  const childSearchSource = searchSource.createChild();
  const indexPattern = searchSource.getField('index');
  childSearchSource.setField('trackTotalHits', true);
  childSearchSource.setField(
    'filter',
    data.query.timefilter.timefilter.createFilter(indexPattern!)
  );
  childSearchSource.setField('size', 0);

  return childSearchSource.fetch$({
    inspector: {
      adapter: inspectorAdapters.requests,
      title: i18n.translate('discover.inspectorRequestDataTitleTotalHits', {
        defaultMessage: 'total hits data',
      }),
      description: i18n.translate('discover.inspectorRequestDescriptionTotalHits', {
        defaultMessage:
          'This request queries Elasticsearch to fetch the total hits number for the search.',
      }),
    },
    abortSignal: abortController.signal,
    sessionId: searchSessionId,
  });
}
