/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Assign } from '@kbn/utility-types';
import { CreateManagementItemArgs, ManagementSectionId } from '../types';
import { ManagementItem } from './management_item';
import { ManagementApp, RegisterManagementAppArgs } from './management_app';

export type RegisterManagementSectionArgs = Assign<
  CreateManagementItemArgs,
  { id: ManagementSectionId | string }
>;

export class ManagementSection extends ManagementItem {
  public readonly apps: ManagementApp[] = [];

  constructor(args: RegisterManagementSectionArgs) {
    super(args);
  }

  registerApp(args: Omit<RegisterManagementAppArgs, 'basePath'>) {
    if (this.getApp(args.id)) {
      throw new Error(`Management app already registered - id: ${args.id}, title: ${args.title}`);
    }

    const app = new ManagementApp({
      ...args,
      basePath: `/${this.id}/${args.id}`,
    });

    this.apps.push(app);

    return app;
  }

  getApp(id: ManagementApp['id']) {
    return this.apps.find((app) => app.id === id);
  }

  getAppsEnabled() {
    return this.apps.filter((app) => app.enabled);
  }
}
