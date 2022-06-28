/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceFactory, SharedUxDocLinksService } from '@kbn/shared-ux-services';

/**
 * A factory function for creating a Storybook implementation of `SharedUxDocLinksService`.
 */
export type SharedUxDocLinksServiceFactory = ServiceFactory<SharedUxDocLinksService>;

/**
 * A factory function for creating a Storybook implementation of `SharedUxDocLinksService`.
 */
export const docLinksServiceFactory: SharedUxDocLinksServiceFactory = () => ({
  dataViewsDocLink: 'https://www.elastic.co/guide/en/kibana/master/data-views.html',
  kibanaGuideDocLink: 'https://www.elastic.co/guide/en/kibana/master/index.html',
});
