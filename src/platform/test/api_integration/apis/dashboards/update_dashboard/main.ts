/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { type SavedObjectReference } from '@kbn/core/server';
import { PUBLIC_API_PATH } from '@kbn/dashboard-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

const updatedDashboard = {
  attributes: {
    title: 'Refresh Requests (Updated)',
    options: { useMargins: false },
    panels: [
      {
        type: 'visualization',
        gridData: { x: 0, y: 0, w: 48, h: 60, i: '1' },
        panelIndex: '1',
        panelRefName: 'panel_1',
        version: '7.3.0',
      },
    ],
    timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
    timeRestore: true,
    timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
  },
  references: [
    {
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
      name: '1:panel_1',
      type: 'visualization',
    },
  ],
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('should return 200 with an updated dashboard', async () => {
      const response = await supertest
        .put(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send(updatedDashboard);

      expect(response.status).to.be(200);

      expect(response.body.item.id).to.be('be3733a0-9efe-11e7-acb3-3dab96693fab');
      expect(response.body.item.type).to.be('dashboard');
      expect(response.body.item.attributes.title).to.be('Refresh Requests (Updated)');
    });

    it('should return 404 when updating a non-existent dashboard', async () => {
      const response = await supertest
        .put(`${PUBLIC_API_PATH}/not-an-id`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title: 'Some other dashboard (updated)',
          },
        });

      expect(response.status).to.be(404);
      expect(response.body).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'A dashboard with saved object ID not-an-id was not found.',
      });
    });

    describe('update a dashboard with tags', () => {
      it('adds a tag to the dashboard', async () => {
        const response = await supertest
          .put(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            ...updatedDashboard,
            attributes: {
              ...updatedDashboard.attributes,
              tags: ['bar'],
            },
          });

        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('bar');
        expect(response.body.item.attributes.tags).to.have.length(1);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-2');
        expect(referenceIds).to.contain('dd7caf20-9efd-11e7-acb3-3dab96693fab');
        expect(response.body.item.references).to.have.length(2);
      });

      it('replaces the tags on the dashboard', async () => {
        const response = await supertest
          .put(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            ...updatedDashboard,
            attributes: {
              ...updatedDashboard.attributes,
              tags: ['foo'],
            },
          });

        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('foo');
        expect(response.body.item.attributes.tags).to.have.length(1);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-1');
        expect(referenceIds).to.contain('dd7caf20-9efd-11e7-acb3-3dab96693fab');
        expect(response.body.item.references).to.have.length(2);
      });

      it('empty tags array removes all tags', async () => {
        const response = await supertest
          .put(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            ...updatedDashboard,
            attributes: {
              ...updatedDashboard.attributes,
              tags: [],
            },
          });

        expect(response.status).to.be(200);
        expect(response.body.item.attributes).not.to.have.property('tags');
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('dd7caf20-9efd-11e7-acb3-3dab96693fab');
        expect(response.body.item.references).to.have.length(1);
      });

      it('creates tag if a saved object matching a tag name is not found', async () => {
        const randomTagName = `tag-${Math.random() * 1000}`;
        const response = await supertest
          .put(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            ...updatedDashboard,
            attributes: {
              ...updatedDashboard.attributes,
              tags: ['foo', 'bar', 'buzz', randomTagName],
            },
          });

        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('foo');
        expect(response.body.item.attributes.tags).to.contain('bar');
        expect(response.body.item.attributes.tags).to.contain('buzz');
        expect(response.body.item.attributes.tags).to.contain(randomTagName);
        expect(response.body.item.attributes.tags).to.have.length(4);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-1');
        expect(referenceIds).to.contain('tag-2');
        expect(referenceIds).to.contain('tag-3');
        expect(referenceIds).to.contain('dd7caf20-9efd-11e7-acb3-3dab96693fab');
        expect(response.body.item.references).to.have.length(5);
      });
    });
  });
}
