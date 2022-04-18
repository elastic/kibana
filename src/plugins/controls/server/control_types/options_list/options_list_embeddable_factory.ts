/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/common';
import { OPTIONS_LIST_CONTROL } from '../../../common';
import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../common/control_types/options_list/options_list_persistable_state';

export const optionsListPersistableStateServiceFactory = (): EmbeddableRegistryDefinition => {
  return {
    id: OPTIONS_LIST_CONTROL,
    extract: createOptionsListExtract(),
    inject: createOptionsListInject(),
  };
};
