/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { MetadataEventType } from '../common';
import { UserContentService } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContentPluginSetup {}

export interface UserContentPluginStart {
  userContentService: Pick<UserContentService, 'register'>;
}

/** The metadata event sent in the API payload from the client */
export interface MetadataEventPayload {
  type: MetadataEventType;
  soId: string;
}
