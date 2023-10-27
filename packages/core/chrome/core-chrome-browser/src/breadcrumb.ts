/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiBreadcrumb } from '@elastic/eui';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { AppDeepLinkId } from './project_navigation';

/** @public */
export interface ChromeBreadcrumb extends EuiBreadcrumb {
  /**
   * The deepLinkId can be used to merge the navigational breadcrumbs set via project navigation
   * with the deeper context breadcrumbs set via the `chrome.setBreadcrumbs` API.
   */
  deepLinkId?: AppDeepLinkId;
}

/** @public */
export interface ChromeBreadcrumbsAppendExtension {
  content: MountPoint<HTMLDivElement>;
}
