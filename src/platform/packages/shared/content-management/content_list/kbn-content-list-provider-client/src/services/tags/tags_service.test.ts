/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Tag } from '@kbn/content-management-tags';
import { createTagsService } from './tags_service';

describe('createTagsService', () => {
  const tags: Tag[] = [
    { id: 'a', name: 'A', description: '', color: '#000', managed: false },
    { id: 'b', name: 'B', description: '', color: '#fff', managed: false },
  ];

  it('returns a service whose `getTagList` proxies to the supplied tagging API', () => {
    const getTagList = jest.fn().mockReturnValue(tags);

    const service = createTagsService({ getTagList });

    expect(service?.getTagList()).toBe(tags);
    expect(getTagList).toHaveBeenCalledTimes(1);
  });

  it('returns `undefined` when no tagging API is supplied', () => {
    expect(createTagsService(undefined)).toBeUndefined();
    expect(createTagsService(null)).toBeUndefined();
  });
});
