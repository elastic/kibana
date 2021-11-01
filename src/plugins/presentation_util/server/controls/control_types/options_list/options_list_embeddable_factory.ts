/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableRegistryDefinition } from '../../../../../embeddable/server';
import { OPTIONS_LIST_CONTROL } from '../../../../common/controls';
import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../../common/controls/control_types/options_list/options_list_persistable_state';

export const optionsListPersistableStateServiceFactory = (): EmbeddableRegistryDefinition => {
  return {
    id: OPTIONS_LIST_CONTROL,
    extract: createOptionsListExtract(),
    inject: createOptionsListInject(),
  };
};
