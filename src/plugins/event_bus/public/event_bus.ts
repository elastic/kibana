/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';

export interface KibanaEvent {
  type: string;
  payload: any;
}

// Create a Subject to act as an event bus
export const eventBus = new Subject<KibanaEvent>();

// Any part of the app can publish an event
function publishEvent(event: KibanaEvent) {
  eventBus.next(event);
}

// Plugins or components can subscribe to events
eventBus.subscribe((event) => {
  if (event.type === 'search-query-updated') {
    // eslint-disable-next-line no-console
    console.log('Received updated search query:', event.payload);
  }
});

// Publishing an event
publishEvent({ type: 'search-query-updated', payload: 'new search term' });
