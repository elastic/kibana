/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CreateManagementItemArgs, Mount } from '../types';
import { ManagementItem } from './management_item';

export interface RegisterManagementAppArgs extends CreateManagementItemArgs {
  mount: Mount;
  basePath: string;
  keywords?: string[];
}

export class ManagementApp extends ManagementItem {
  public readonly mount: Mount;
  public readonly basePath: string;
  public readonly keywords: string[];

  constructor(args: RegisterManagementAppArgs) {
    super(args);

    this.mount = args.mount;
    this.basePath = args.basePath;
    this.keywords = args.keywords || [];
  }
}
