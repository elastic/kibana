/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AppMeta } from 'kibana/public';
import { CreateManagementItemArgs, Mount } from '../types';
import { ManagementItem } from './management_item';

export interface RegisterManagementAppArgs extends CreateManagementItemArgs {
  mount: Mount;
  basePath: string;
  meta?: AppMeta;
}

export class ManagementApp extends ManagementItem {
  public readonly mount: Mount;
  public readonly basePath: string;
  public readonly meta: AppMeta;

  constructor(args: RegisterManagementAppArgs) {
    super(args);

    this.mount = args.mount;
    this.basePath = args.basePath;
    this.meta = {
      keywords: args.meta?.keywords || [],
    };
  }
}
