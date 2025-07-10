/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup } from '@kbn/core/public';
import { ContentManagementPublicSetup } from '@kbn/content-management-plugin/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { BOOK_CONTENT_ID, BOOK_EMBEDDABLE_TYPE, BOOK_LATEST_VERSION } from '../../../common';

export function setupBookEmbeddable(core: CoreSetup, embeddable: EmbeddableSetup, contentManagement: ContentManagementPublicSetup) {
  embeddable.registerReactEmbeddableFactory(BOOK_EMBEDDABLE_TYPE, async () => {
    const { getSavedBookEmbeddableFactory } = await import(
      './saved_book_react_embeddable'
    );
    const [coreStart] = await core.getStartServices();
    return getSavedBookEmbeddableFactory(coreStart);
  });

  embeddable.registerTransforms(BOOK_EMBEDDABLE_TYPE, async () => {
    const { bookTransforms } = await import('../../../common/book/transforms');
    return bookTransforms;
  });

  contentManagement.registry.register({
    id: BOOK_CONTENT_ID,
    version: {
      latest: BOOK_LATEST_VERSION,
    },
  });


}