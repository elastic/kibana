/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateManagementItemArgs, Mount } from '../types';
import { ManagementItem } from './management_item';
export type ManagementAppPaddingSize = 'none' | 's' | 'm' | 'l';
export interface RegisterManagementAppArgs extends CreateManagementItemArgs {
  mount: Mount;
  basePath: string;
  keywords?: string[];
  /**
   * Opt-in override for the `KibanaPageTemplate` main section padding. When left
   * unset, the template's own default padding is used, so most apps should not
   * need to set this.
   */
  mainPaddingSize?: ManagementAppPaddingSize;
}
export declare class ManagementApp extends ManagementItem {
  readonly mount: Mount;
  readonly basePath: string;
  readonly keywords: string[];
  readonly mainPaddingSize?: ManagementAppPaddingSize;
  constructor(args: RegisterManagementAppArgs);
}
