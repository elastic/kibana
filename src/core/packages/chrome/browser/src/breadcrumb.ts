/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  /** The order in which the extension should be appended to the breadcrumbs. Default is 50 */
  order?: number;
}

/** @public */
export interface ChromeSetBreadcrumbsParams {
  /**
   * Declare the breadcrumbs for the project/solution type navigation in stateful.
   * Those breadcrumbs correspond to the serverless breadcrumbs declaration.
   */
  project?: {
    /**
     * The breadcrumb value to set. Can be a single breadcrumb or an array of breadcrumbs.
     */
    value: ChromeBreadcrumb | ChromeBreadcrumb[];
    /**
     * Indicates whether the breadcrumb should be absolute (replaces the full path) or relative.
     * @default false
     */
    absolute?: boolean;
  };
}
