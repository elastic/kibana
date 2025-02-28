/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';
import { RandomDashboardService } from './random_dashboard';
import { RandomDataViewService } from './random_data_view';

enum ResourceAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

enum ResourceType {
  DATA_VIEW = 'DataView',
  DASHBOARD = 'Dashboard',
}

export class RandomActionService extends FtrService {
  private readonly randomness = this.ctx.getService('randomness');
  private readonly randomDashboard = new RandomDashboardService(this.ctx);
  private readonly randomDataView = new RandomDataViewService(this.ctx);

  async createRandomDataView() {
    await this.randomDataView.createDataView();
  }

  async updateRandomDataView() {
    await this.randomDataView.updateDataView();
  }

  async deleteRandomDataView() {
    await this.randomDataView.deleteDataView();
  }

  async createRandomDashboard() {
    await this.randomDashboard.createDashboard();
  }

  async updateRandomDashboard() {
    await this.randomDashboard.updateDashboard();
  }

  async deleteRandomDashboard() {
    await this.randomDashboard.deleteDashboard();
  }

  async performRandomAction() {
    const action = this.randomness.pickFromArray(Object.values(ResourceAction));
    const type = this.randomness.pickFromArray(Object.values(ResourceType));
    await this[`${action}Random${type}`]();
  }
}
