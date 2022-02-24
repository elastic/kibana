/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '../types';
import { SharedUXDocLinksService } from '../doc_links';

export type DockLinksServiceFactory = PluginServiceFactory<SharedUXDocLinksService>;

/**
 * A factory function for creating a Jest-based implementation of `SharedUXDocLinksService`.
 */
export const docLinksServiceFactory: DockLinksServiceFactory = () => ({
  dataViewsDocsLink: 'docs',
});
