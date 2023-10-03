/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput } from '../embeddables';
import { runEmbeddableFactoryMigrations } from './run_factory_migrations';

describe('Run embeddable factory migrations', () => {
  interface TestInputTypeVersion009 extends EmbeddableInput {
    version: '0.0.9';
    keyThatAlwaysExists: string;
    keyThatGetsRemoved: string;
  }
  interface TestInputTypeVersion100 extends EmbeddableInput {
    version: '1.0.0';
    id: string;
    keyThatAlwaysExists: string;
    keyThatGetsAdded: string;
  }

  const migrations = {
    '1.0.0': (input: TestInputTypeVersion009): TestInputTypeVersion100 => {
      const newInput: TestInputTypeVersion100 = {
        id: input.id,
        version: '1.0.0',
        keyThatAlwaysExists: input.keyThatAlwaysExists,
        keyThatGetsAdded: 'I just got born',
      };
      return newInput;
    },
  };

  it('should return the initial input and migrationRun=false if the current version is the latest', () => {
    const initialInput: TestInputTypeVersion100 = {
      id: 'superId',
      version: '1.0.0',
      keyThatAlwaysExists: 'Inside Problems',
      keyThatGetsAdded: 'Oh my - I just got born',
    };

    const factory = {
      latestVersion: '1.0.0',
      migrations,
    };

    const result = runEmbeddableFactoryMigrations<TestInputTypeVersion100>(initialInput, factory);

    expect(result.input).toBe(initialInput);
    expect(result.migrationRun).toBe(false);
  });

  it('should return migrated input and migrationRun=true if version does not match latestVersion', () => {
    const initialInput: TestInputTypeVersion009 = {
      id: 'superId',
      version: '0.0.9',
      keyThatAlwaysExists: 'Inside Problems',
      keyThatGetsRemoved: 'juvenile plumage',
    };

    const factory = {
      latestVersion: '1.0.0',
      migrations,
    };

    const result = runEmbeddableFactoryMigrations<TestInputTypeVersion100>(initialInput, factory);

    expect(result.migrationRun).toBe(true);
    expect(result.input.version).toBe('1.0.0');
    expect((result.input as unknown as TestInputTypeVersion009).keyThatGetsRemoved).toBeUndefined();
    expect(result.input.keyThatGetsAdded).toEqual('I just got born');
  });
});
