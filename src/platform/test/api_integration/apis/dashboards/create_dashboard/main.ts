/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PUBLIC_API_PATH } from '@kbn/dashboard-plugin/server';
import { DEFAULT_IGNORE_PARENT_SETTINGS } from '@kbn/controls-constants';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('sets top level default values', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
        });

      expect(response.status).to.be(200);
      expect(response.body.data.kibanaSavedObjectMeta.searchSource).to.eql({});
      expect(response.body.data.panels).to.eql([]);
      expect(response.body.data.timeRestore).to.be(false);
      expect(response.body.data.options).to.eql({
        hidePanelTitles: false,
        useMargins: true,
        syncColors: true,
        syncTooltips: true,
        syncCursor: true,
      });
    });

    it('sets panels default values', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
          panels: [
            {
              type: 'visualization',
              grid: {
                x: 0,
                y: 0,
                w: 24,
                h: 15,
              },
              config: {},
            },
          ],
        });

      expect(response.status).to.be(200);
      expect(response.body.data.panels).to.be.an('array');
      // panel index is a random uuid when not provided
      expect(response.body.data.panels[0].uid).match(/^[0-9a-f-]{36}$/);
      expect(response.body.data.panels[0].uid).to.eql(response.body.data.panels[0].grid.i);
    });

    it('sets controls default values', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
          controlGroupInput: {
            controls: [
              {
                type: 'optionsListControl',
                order: 0,
                width: 'medium',
                grow: true,
                controlConfig: {
                  title: 'Origin City',
                  fieldName: 'OriginCityName',
                  dataViewId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                  selectedOptions: [],
                  enhancements: {},
                },
              },
            ],
          },
        });

      expect(response.status).to.be(200);
      // generates a random saved object id
      expect(response.body.id).match(/^[0-9a-f-]{36}$/);
      // saved object stores controls panels as an object, but the API should return as an array
      expect(response.body.data.controlGroupInput.controls).to.be.an('array');

      expect(response.body.data.controlGroupInput.ignoreParentSettings).to.eql(
        DEFAULT_IGNORE_PARENT_SETTINGS
      );
    });

    it('can create a dashboard with a specific id', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      const id = `bar-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(`${PUBLIC_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
        });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(id);
    });

    it('creates a dashboard with references', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
          panels: [
            {
              type: 'visualization',
              grid: {
                x: 0,
                y: 0,
                w: 24,
                h: 15,
                i: 'bizz',
              },
              config: {},
              uid: 'bizz',
            },
          ],
          references: [
            {
              name: 'bizz:panel_bizz',
              type: 'visualization',
              id: 'my-saved-object',
            },
          ],
        });

      expect(response.status).to.be(200);
      expect(response.body.data.panels).to.be.an('array');
    });

    // TODO Maybe move this test to x-pack/platform/test/api_integration/dashboards
    it('can create a dashboard in a defined space', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const spaceId = 'space-1';

      const response = await supertest
        .post(`/s/${spaceId}${PUBLIC_API_PATH}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
          spaces: [spaceId],
        });

      expect(response.status).to.be(200);
      expect(response.body.data.namespaces).to.eql([spaceId]);
    });

    it('return error if provided id already exists', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      // id is a saved object loaded by the kbn_archiver
      const id = 'be3733a0-9efe-11e7-acb3-3dab96693fab';

      const response = await supertest
        .post(`${PUBLIC_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          title,
        });

      expect(response.status).to.be(409);
      expect(response.body.message).to.be(
        'A dashboard with saved object ID be3733a0-9efe-11e7-acb3-3dab96693fab already exists.'
      );
    });
  });
}
