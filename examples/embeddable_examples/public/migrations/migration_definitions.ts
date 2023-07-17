/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MigrateFunction } from '@kbn/kibana-utils-plugin/common/persistable_state';
import { EmbeddableInput } from '@kbn/embeddable-plugin/common';
import { SimpleEmbeddableInput } from './migrations_embeddable_factory';

// before 7.3.0 this embeddable received a very simple input with a variable named `number`
type SimpleEmbeddableInputV1 = EmbeddableInput & {
  number: number;
};

type SimpleEmbeddable730MigrateFn = MigrateFunction<SimpleEmbeddableInputV1, SimpleEmbeddableInput>;

// when migrating old state we'll need to set a default title, or we should make title optional in the new state
const defaultTitle = 'no title';

export const migrateToVersion2: SimpleEmbeddable730MigrateFn = (state) => {
  const newState: SimpleEmbeddableInput = { ...state, title: defaultTitle, value: state.number };
  return newState;
};
