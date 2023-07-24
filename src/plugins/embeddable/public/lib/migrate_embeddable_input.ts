/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { migrateToLatest } from '@kbn/kibana-utils-plugin/common';
import { EmbeddableFactory, EmbeddableInput } from './embeddables';

/**
 * A helper function that migrates an Embeddable Input to its latest version.
 */
export const migrateEmbeddableInput = <InputType extends EmbeddableInput>(
  initialInput: InputType,
  factory: { migrations?: EmbeddableFactory['migrations']; latestVersion: string }
): InputType => {
  const factoryMigrations =
    typeof factory?.migrations === 'function' ? factory?.migrations() : factory?.migrations || {};
  const migratedInput = migrateToLatest(
    factoryMigrations ?? {},
    {
      state: cloneDeep(initialInput),
      // any embeddable with no version set is considered to require all clientside migrations
      version: initialInput.version ?? '0',
    },
    true
  );
  migratedInput.version = factory.latestVersion;
  return migratedInput as InputType;
};
