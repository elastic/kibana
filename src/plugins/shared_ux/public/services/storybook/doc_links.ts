/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUxDocLinksService, ServiceFactory } from '@kbn/shared-ux-services';

export type SharedUXDockLinksServiceFactory = ServiceFactory<SharedUxDocLinksService>;

/**
 * A factory function for creating a Jest-based implementation of `SharedUXDocLinksService`.
 */
export const docLinksServiceFactory: SharedUXDockLinksServiceFactory = () => ({
  dataViewsDocLink: 'https://www.elastic.co/guide/en/kibana/master/data-views.html',
});
