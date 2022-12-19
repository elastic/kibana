/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { CmCachedItem, ContentItem } from '@kbn/content-management-state';
import { useContent } from './use_content';

export const useContentItem = (id: string): UseContentItemResult => {
  const { cache } = useContent();
  const item = React.useMemo(() => cache.item(id), [cache, id]);
  const data = useObservable(item.data$) as ContentItem | undefined;

  return {
    item,
    data,
  };
};

export interface UseContentItemResult {
  item: CmCachedItem;
  data: ContentItem | undefined;
}
