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

export class RandomDataViewService extends FtrService {
  private readonly kbnSupertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');
  private readonly randomness = this.ctx.getService('randomness');

  public getRandomDataViewBody() {
    return {
      data_view: {
        name: this.randomness.string(),
        title: this.randomness.string(),
      },
    };
  }

  public async getAllDataViewIds() {
    const dataViewIds: string[] = [];

    const { body, status } = await this.kbnSupertest
      .get('/api/data_views')
      .set(COMMON_REQUEST_HEADERS);
    assertResponseStatusCode(200, status, body);
    for (const item of body.data_view) {
      dataViewIds.push(item.id);
    }

    return dataViewIds;
  }

  public async getDataView(dataViewId: string) {
    const { body, status } = await this.kbnSupertest
      .get(`/api/data_views/data_view/${dataViewId}`)
      .set(COMMON_REQUEST_HEADERS);
    assertResponseStatusCode(200, status, body);
    return body;
  }

  public async getRandomDataViewId() {
    const dataViewIds = await this.getAllDataViewIds();
    if (dataViewIds.length === 0) {
      return;
    }
    return this.randomness.pickFromArray(dataViewIds);
  }

  public async createDataView() {
    const requestBody = this.getRandomDataViewBody();

    this.log.info(`Creating dataView with title ${requestBody.data_view.title}...`);
    const { body, status } = await this.kbnSupertest
      .post('/api/data_views/data_view')
      .set(COMMON_REQUEST_HEADERS)
      .send(this.getRandomDataViewBody());
    assertResponseStatusCode(200, status, body);
  }

  public async updateDataView() {
    const id = await this.getRandomDataViewId();
    if (id === undefined) {
      this.log.warning('No dataViews exist. Nothing to update.');
      return;
    }

    this.log.info(`Updating dataView with id ${id}...`);
    const { body, status } = await this.kbnSupertest
      .post(`/api/data_views/data_view/${id}`)
      .set(COMMON_REQUEST_HEADERS)
      .send(this.getRandomDataViewBody());
    assertResponseStatusCode(200, status, body);
  }

  public async deleteDataView() {
    const id = await this.getRandomDataViewId();
    if (id === undefined) {
      this.log.warning('No dataViews exist. Nothing to delete.');
      return;
    }

    this.log.info(`Deleting dataView with id ${id}...`);
    const { body, status } = await this.kbnSupertest
      .delete(`/api/data_views/data_view/${id}`)
      .set(COMMON_REQUEST_HEADERS);
    assertResponseStatusCode(200, status, body);
  }
}
