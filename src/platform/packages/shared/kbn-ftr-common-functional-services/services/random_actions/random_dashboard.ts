/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';
import { COMMON_REQUEST_HEADERS, assertResponseStatusCode } from './shared';

export class RandomDashboardService extends FtrService {
  private readonly kbnSupertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');
  private readonly randomness = this.ctx.getService('randomness');

  public getRandomDashboardBody() {
    return {
      attributes: {
        title: this.randomness.string(),
      },
    };
  }

  public async getDashboardCount() {
    const { body, status } = await this.kbnSupertest
      .get('/api/dashboards/dashboard')
      .query({ page: 1, perPage: 1 })
      .set(COMMON_REQUEST_HEADERS);
    assertResponseStatusCode(200, status, body);
    return body.total;
  }

  public async getAllDashboardIds() {
    const dashboardIds: string[] = [];
    const dashboardCount = await this.getDashboardCount();
    if (dashboardCount === 0) {
      return dashboardIds;
    }

    const perPage = 100;
    for (let page = 1; page <= Math.ceil(dashboardCount / perPage); page++) {
      const { body, status } = await this.kbnSupertest
        .get('/api/dashboards/dashboard')
        .query({ page, perPage })
        .set(COMMON_REQUEST_HEADERS);
      assertResponseStatusCode(200, status, body);
      for (const item of body.items) {
        dashboardIds.push(item.id);
      }
    }

    return dashboardIds;
  }

  public async getDashboard(dashboardId: string) {
    const { body, status } = await this.kbnSupertest
      .get(`/api/dashboards/dashboard/${dashboardId}`)
      .set(COMMON_REQUEST_HEADERS);
    assertResponseStatusCode(200, status, body);
    return body;
  }

  public async getRandomDashboardId() {
    const dashboardIds = await this.getAllDashboardIds();
    if (dashboardIds.length === 0) {
      return;
    }
    return this.randomness.pickFromArray(dashboardIds);
  }

  public async createDashboard() {
    const id = this.randomness.string();

    this.log.info(`Creating dashboard with id ${id}...`);
    const { body, status } = await this.kbnSupertest
      .post(`/api/dashboards/dashboard/${id}`)
      .set(COMMON_REQUEST_HEADERS)
      .send(this.getRandomDashboardBody());
    assertResponseStatusCode(200, status, body);
  }

  public async updateDashboard() {
    const id = await this.getRandomDashboardId();
    if (id === undefined) {
      this.log.warning('No dashboards exist. Nothing to update.');
      return;
    }

    this.log.info(`Updating dashboard with id ${id}...`);
    const { body, status } = await this.kbnSupertest
      .put(`/api/dashboards/dashboard/${id}`)
      .set(COMMON_REQUEST_HEADERS)
      .send(this.getRandomDashboardBody());
    // TODO: update expected status to 200 once it's fixed in the application
    assertResponseStatusCode(201, status, body);
  }

  public async deleteDashboard() {
    const id = await this.getRandomDashboardId();
    if (id === undefined) {
      this.log.warning('No dashboards exist. Nothing to delete.');
      return;
    }

    this.log.info(`Deleting dashboard with id ${id}...`);
    const { body, status } = await this.kbnSupertest
      .delete(`/api/dashboards/dashboard/${id}`)
      .set(COMMON_REQUEST_HEADERS);
    assertResponseStatusCode(200, status, body);
  }
}
