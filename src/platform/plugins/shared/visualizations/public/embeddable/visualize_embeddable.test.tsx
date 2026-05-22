/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import type { VisualizeApi } from './types';
import { visualizeEmbeddableFactory } from './visualize_embeddable';
import { BehaviorSubject } from 'rxjs';
import { initializeDrilldownsManager } from '@kbn/embeddable-plugin/public/drilldowns/drilldowns_manager';
import type { SerializedVis } from '../vis';

jest.mock('./create_vis_instance', () => {
  return {
    createVisInstance: async (serializedVis: SerializedVis) => ({
      ...serializedVis,
      serialize: () => serializedVis,
    }),
  };
});

describe('visualizeEmbeddable', () => {
  let embeddableApi: VisualizeApi;
  beforeEach((done) => {
    const parent = {};
    const uuid = '1';
    const finalizeApi = (api: any) => ({
      ...api,
      uuid,
      parent,
      type: VISUALIZE_EMBEDDABLE_TYPE,
      phase$: new BehaviorSubject(undefined),
    });
    visualizeEmbeddableFactory
      .buildEmbeddable({
        initializeDrilldownsManager,
        initialState: {
          savedVis: {
            title: 'count',
            type: 'metric',
            data: {
              aggs: [
                {
                  id: '1',
                  enabled: true,
                  type: 'count',
                  params: {
                    emptyAsNull: false,
                  },
                  schema: 'metric',
                },
              ],
              searchSource: {
                query: {
                  query: '',
                  language: 'kuery',
                },
                filter: [],
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
              },
            },
            params: {
              type: 'metric',
              metric: {},
            },
          },
        },
        finalizeApi,
        uuid: '1',
        parentApi: {},
      })
      .then(({ api }) => {
        embeddableApi = api;
        done();
      })
      .catch(done);
  });

  describe('anyStateChange$', () => {
    test('should not emit on subscribe and emit when any state changes', (done) => {
      embeddableApi.anyStateChange$.subscribe(() => {
        try {
          const { title } = embeddableApi.serializeState();
          expect(title).toBe('cute puppies');
        } catch (error) {
          // title assertion fails when
          // anyStateChange$ emits on subscribe
          done(error);
          return;
        }
        done();
      });
      embeddableApi.setTitle('cute puppies');
    });
  });
});
