/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IBasePath } from '@kbn/core-http-browser';

/**
 * @internal
 */
export type SetActiveNavItemIdFn = (activeNavItemId: string) => void;

/**
 * @internal
 */
export interface RecentItem {
  link: string;
  label: string;
  id: string;
}

export type NavigateToUrlFn = ApplicationStart['navigateToUrl'];

export type BasePathService = Pick<IBasePath, 'prepend'>;
