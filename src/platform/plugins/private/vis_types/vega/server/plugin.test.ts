/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", or the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { VEGA_EMBEDDABLE_TYPE } from '../common/constants';
import { VisTypeVegaPlugin } from './plugin';
import { getVegaByValueSchema } from './embeddable/schema';

describe('VisTypeVegaPlugin', () => {
  it('registers the dedicated Vega by-value schema', () => {
    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(coreMock.createSetup(), { embeddable });

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      VEGA_EMBEDDABLE_TYPE,
      {
        title: 'Vega',
        getSchema: getVegaByValueSchema,
      }
    );
  });
});
