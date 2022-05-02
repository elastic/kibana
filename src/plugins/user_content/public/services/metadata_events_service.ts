/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';

import { withApiBaseBath } from '../../common';
import { MetadataEventPayload } from '../types';

interface Dependencies {
  http: HttpSetup;
}

/**
 * This service is in charge of registering all the metadata events (e.g "viewed",
 * "edited", "imported", "deleted") for a user generated content.
 */
export class MetadataEventsService {
  private http: HttpSetup | undefined;

  constructor() {}

  init({ http }: Dependencies) {
    this.http = http;
  }

  registerEvent({ type, soId }: MetadataEventPayload) {
    return this.http
      ?.post(withApiBaseBath(`/event/${type}`), {
        body: JSON.stringify({
          soId,
        }),
      })
      .catch(() => {
        // silently fail
      });
  }

  bulkRegisterEvents(events: MetadataEventPayload[]) {
    return this.http
      ?.post(withApiBaseBath(`/event/_bulk`), {
        body: JSON.stringify(events),
      })
      .catch(() => {
        // silently fail
      });
  }
}
