/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { DiscoverServices } from '../build_services';
import { deserializeState } from './utils/serialization_utils';

export const getOnAddSearchEmbeddable =
  (
    discoverServices: DiscoverServices
  ): Parameters<EmbeddableSetup['registerAddFromLibraryType']>[0]['onAdd'] =>
  async (container, savedObject) => {
    const initialState = await deserializeState({
      serializedState: {
        rawState: { savedObjectId: savedObject.id },
        references: savedObject.references,
      },
      discoverServices,
    });

    container.addNewPanel({
      panelType: SEARCH_EMBEDDABLE_TYPE,
      initialState,
    });
  };
