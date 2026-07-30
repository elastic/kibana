/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IMAGE_EMBEDDABLE_TYPE } from '../../common/constants';
import type { ImageEmbeddableApi } from '../types';
import { getImageEmbeddableFactory } from './get_image_embeddable_factory';
import { initializeDrilldownsManager } from '@kbn/embeddable-plugin/public/drilldowns/drilldowns_manager';
import { BehaviorSubject } from 'rxjs';

describe('image embeddable', () => {
  let embeddableApi: ImageEmbeddableApi;
  beforeEach((done) => {
    const parent = {};
    const uuid = '1';
    const finalizeApi = (api: any) => ({
      ...api,
      uuid,
      parent,
      type: IMAGE_EMBEDDABLE_TYPE,
      phase$: new BehaviorSubject(undefined),
    });
    const { buildEmbeddable } = getImageEmbeddableFactory();
    buildEmbeddable({
      initializeDrilldownsManager,
      initialState: {
        image_config: {
          src: {
            type: 'file',
            file_id: 'puppy.png',
          },
          object_fit: 'fill',
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
