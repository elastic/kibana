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
import { DEFAULT_IGNORE_PARENT_SETTINGS } from '@kbn/controls-constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('sets top level default values', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title,
          },
        });

      expect(response.status).to.be(200);
      expect(response.body.item.attributes.kibanaSavedObjectMeta.searchSource).to.eql({});
      expect(response.body.item.attributes.panels).to.eql([]);
      expect(response.body.item.attributes.timeRestore).to.be(false);
      expect(response.body.item.attributes.options).to.eql({
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
        .send({
          attributes: {
            title,
            panels: [
              {
                type: 'visualization',
                gridData: {
                  x: 0,
                  y: 0,
                  w: 24,
                  h: 15,
                },
                panelConfig: {},
              },
            ],
          },
        });

      expect(response.status).to.be(200);
      expect(response.body.item.attributes.panels).to.be.an('array');
      // panel index is a random uuid when not provided
      expect(response.body.item.attributes.panels[0].panelIndex).match(/^[0-9a-f-]{36}$/);
      expect(response.body.item.attributes.panels[0].panelIndex).to.eql(
        response.body.item.attributes.panels[0].gridData.i
      );
    });

    it('sets controls default values', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
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
          },
        });

      expect(response.status).to.be(200);
      // generates a random saved object id
      expect(response.body.item.id).match(/^[0-9a-f-]{36}$/);
      // saved object stores controls panels as an object, but the API should return as an array
      expect(response.body.item.attributes.controlGroupInput.controls).to.be.an('array');

      expect(response.body.item.attributes.controlGroupInput.ignoreParentSettings).to.eql(
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
        .send({
          attributes: { title },
        });

      expect(response.status).to.be(200);
      expect(response.body.item.id).to.be(id);
    });

    it('creates a dashboard with references', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title,
            panels: [
              {
                type: 'visualization',
                gridData: {
                  x: 0,
                  y: 0,
                  w: 24,
                  h: 15,
                  i: 'bizz',
                },
                panelConfig: {},
                panelIndex: 'bizz',
                panelRefName: 'panel_bizz',
              },
            ],
          },
          references: [
            {
              name: 'bizz:panel_bizz',
              type: 'visualization',
              id: 'my-saved-object',
            },
          ],
        });

      expect(response.status).to.be(200);
      expect(response.body.item.attributes.panels).to.be.an('array');
    });

    describe('create a dashboard with tags', () => {
      it('with tags specified as an array of names', async () => {
        const title = `foo-${Date.now()}-${Math.random()}`;

        const response = await supertest
          .post(PUBLIC_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            attributes: {
              title,
              tags: ['foo'],
            },
            references: [
              {
                name: 'bizz:panel_bizz',
                type: 'visualization',
                id: 'my-saved-object',
              },
            ],
          });

        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('foo');
        expect(response.body.item.attributes.tags).to.have.length(1);
        // adds tag reference to existing references
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-1');
        expect(referenceIds).to.contain('my-saved-object');
        expect(response.body.item.references).to.have.length(2);
      });

      it('creates tags if a saved object matching a tag name is not found', async () => {
        const title = `foo-${Date.now()}-${Math.random()}`;
        const response = await supertest
          .post(PUBLIC_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            attributes: {
              title,
              tags: ['foo', 'not-found-tag'],
            },
          });
        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('foo', 'not-found-tag');
        expect(response.body.item.attributes.tags).to.have.length(2);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-1');
        expect(response.body.item.references).to.have.length(2);
      });

      it('with tags specified as references', async () => {
        const title = `foo-${Date.now()}-${Math.random()}`;
        const response = await supertest
          .post(PUBLIC_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            attributes: {
              title,
            },
            references: [
              {
                type: 'tag',
                id: 'tag-3',
                name: 'tag-ref-tag-3',
              },
            ],
          });
        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('buzz');
        expect(response.body.item.attributes.tags).to.have.length(1);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-3');
        expect(response.body.item.references).to.have.length(1);
      });

      it('with tags specified using both tags array and references', async () => {
        const title = `foo-${Date.now()}-${Math.random()}`;
        const response = await supertest
          .post(PUBLIC_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            attributes: {
              title,
              tags: ['foo'],
            },
            references: [
              {
                type: 'tag',
                id: 'tag-2',
                name: 'tag-ref-tag-2',
              },
            ],
          });
        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('foo');
        expect(response.body.item.attributes.tags).to.contain('bar');
        expect(response.body.item.attributes.tags).to.have.length(2);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-1');
        expect(referenceIds).to.contain('tag-2');
        expect(response.body.item.references).to.have.length(2);
      });

      it('with the same tag specified as a reference and a tag name', async () => {
        const title = `foo-${Date.now()}-${Math.random()}`;
        const response = await supertest
          .post(PUBLIC_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
          .send({
            attributes: {
              title,
              tags: ['foo', 'buzz'],
            },
            references: [
              {
                type: 'tag',
                id: 'tag-1',
                name: 'tag-ref-tag-1',
              },
            ],
          });
        expect(response.status).to.be(200);
        expect(response.body.item.attributes.tags).to.contain('foo');
        expect(response.body.item.attributes.tags).to.contain('buzz');
        expect(response.body.item.attributes.tags).to.have.length(2);
        const referenceIds = response.body.item.references.map(
          (ref: SavedObjectReference) => ref.id
        );
        expect(referenceIds).to.contain('tag-1');
        expect(referenceIds).to.contain('tag-3');
        expect(response.body.item.references).to.have.length(2);
      });
    });

    // TODO Maybe move this test to x-pack/test/api_integration/dashboards
    it('can create a dashboard in a defined space', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const spaceId = 'space-1';

      const response = await supertest
        .post(`/s/${spaceId}${PUBLIC_API_PATH}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title,
          },
          spaces: [spaceId],
        });

      expect(response.status).to.be(200);
      expect(response.body.item.namespaces).to.eql([spaceId]);
    });

    it('return error if provided id already exists', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      // id is a saved object loaded by the kbn_archiver
      const id = 'be3733a0-9efe-11e7-acb3-3dab96693fab';

      const response = await supertest
        .post(`${PUBLIC_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title,
          },
        });

      expect(response.status).to.be(409);
      expect(response.body.message).to.be(
        'A dashboard with saved object ID be3733a0-9efe-11e7-acb3-3dab96693fab already exists.'
      );
    });
  });
}
