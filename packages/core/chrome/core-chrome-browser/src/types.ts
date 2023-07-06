/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IconType } from '@elastic/eui';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

/** @public */
export interface ChromeBadge {
  text: string;
  tooltip: string;
  iconType?: IconType;
}

/** @public */
export interface ChromeUserBanner {
  content: MountPoint<HTMLDivElement>;
}

/** @public */
export type ChromeStyle = 'classic' | 'project';
