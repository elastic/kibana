/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';

export const HELLO_LOCATOR = 'HELLO_LOCATOR';

export interface HelloLocatorV1Params extends SerializableRecord {
  name: string;
}

export interface HelloLocatorV2Params extends SerializableRecord {
  firstName: string;
  lastName: string;
}

export type HelloLocatorParams = HelloLocatorV2Params;

const migrateV1ToV2: MigrateFunction<HelloLocatorV1Params, HelloLocatorV2Params> = (
  v1: HelloLocatorV1Params
) => {
  const v2: HelloLocatorV2Params = {
    firstName: v1.name,
    lastName: '',
  };

  return v2;
};

export type HelloLocator = LocatorPublic<HelloLocatorParams>;

export class HelloLocatorDefinition implements LocatorDefinition<HelloLocatorParams> {
  public readonly id = HELLO_LOCATOR;

  public readonly getLocation = async ({ firstName, lastName }: HelloLocatorParams) => {
    return {
      app: 'locatorExamples',
      path: `/hello?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(
        lastName
      )}`,
      state: {},
    };
  };

  public readonly migrations = {
    '0.0.2': migrateV1ToV2 as unknown as MigrateFunction,
  };
}
