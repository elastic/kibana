/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
