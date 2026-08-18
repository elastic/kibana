/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { IMAGE_EMBEDDABLE_TYPE } from '../common/constants';
import { getTransforms } from '../common/transforms';
import { getImageEmbeddableSchema } from './schemas';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ImageEmbeddablePlugin extends Service {
  static readonly inject = ['embeddable.setup'];
  static readonly provide = 'imageEmbeddable';

  constructor(ctx: Context) {
    super(ctx, 'imageEmbeddable');
    const plugins = {
      embeddable: (ctx.get('embeddable.setup') as any).contract,
    };
    plugins.embeddable.registerEmbeddableServerDefinition(IMAGE_EMBEDDABLE_TYPE, {
          title: 'Image',
          getTransforms,
          getSchema: (getDrilldownsSchemas: Parameters<typeof getImageEmbeddableSchema>[0]) => getImageEmbeddableSchema(getDrilldownsSchemas),
        });
  }
}
