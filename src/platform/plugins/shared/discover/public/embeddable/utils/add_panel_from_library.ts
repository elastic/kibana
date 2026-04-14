/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RegistryItem } from '@kbn/embeddable-plugin/public/add_from_library/registry';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { DiscoverSessionEmbeddableState } from '../../../server';

type OnAddParams = Parameters<RegistryItem['onAdd']>;

export const addPanelFromLibrary: (...params: OnAddParams) => Promise<void> = async (
  container,
  savedObject
) => {
  await container.addNewPanel<DiscoverSessionEmbeddableState>(
    {
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState: {
        ref_id: savedObject.id,
        overrides: {},
      },
    },
    {
      displaySuccessMessage: true,
    }
  );
};
