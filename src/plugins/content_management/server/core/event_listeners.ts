/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Content } from '../../common';
import { schemas } from '../../common';
import type { EventBus } from './event_bus';
import type { ContentRegistry } from './registry';
import type { CreateItemSuccess } from './event_types';
import type { ContentSearchIndex } from './search';

export const init = ({
  eventBus,
  contentRegistry,
  searchIndex,
}: {
  eventBus: EventBus;
  contentRegistry: ContentRegistry;
  searchIndex: ContentSearchIndex;
}) => {
  const onContentCreated = (event: CreateItemSuccess): void => {
    // Index the data
    const serializer = contentRegistry.getConfig(event.contentType)?.toSearchContentSerializer;

    const content: Content = serializer ? serializer(event.data) : (event.data as Content);
    const validation = schemas.content.searchIndex.getSchema().validate(content);

    if (validation.error) {
      throw new Error(`Can't index content [${event.contentType}] created, invalid Content.`);
    }

    searchIndex.index(content);
  };

  eventBus.events$.subscribe((event) => {
    if (event.type === 'createItemSuccess') {
      onContentCreated(event);
    }
  });
};
