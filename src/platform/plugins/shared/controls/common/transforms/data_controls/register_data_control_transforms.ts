/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { extractReferences, injectReferences } from './references';

export const registerDataControlTransforms = (
  embeddable: EmbeddableSetup,
  type: string,
  refName: string,
  legacyRefNames: string[]
) => {
  embeddable.registerTransforms(type, {
    getTransforms: () => ({
      transformIn: (state) => extractReferences(state, refName),
      transformOut: (state, panelReferences, containerReferences, id) =>
        injectReferences(id, state, legacyRefNames, panelReferences, containerReferences),
    }),
  });
};
