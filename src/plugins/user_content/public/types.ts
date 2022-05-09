/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiBasicTableColumn } from '@elastic/eui';
import { MetadataEventType, ViewsCountRangeField } from '../common';
import { MetadataEventsService } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContentPluginSetup {}

export interface UserContentPluginStart {
  ui: {
    getUserContentTableColumnsDefinitions: (
      options: GetUserContentTableColumnsDefinitionsOptions
    ) => Promise<Array<EuiBasicTableColumn<Record<string, unknown>>>>;
  };
  events: {
    register: MetadataEventsService['registerEvent'];
    bulkRegister: MetadataEventsService['bulkRegisterEvents'];
  };
}

export interface GetUserContentTableColumnsDefinitionsOptions {
  contentType: string;
  selectedViewsRange: ViewsCountRangeField;
}

/** The metadata event sent in the API payload from the client */
export interface MetadataEventPayload {
  type: MetadataEventType;
  soId: string;
}
