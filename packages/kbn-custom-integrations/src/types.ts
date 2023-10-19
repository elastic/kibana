/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint-disable max-classes-per-file */
import * as rt from 'io-ts';

export const integrationNameRT = rt.string;
export type IntegrationName = rt.TypeOf<typeof integrationNameRT>;

const datasetTypesRT = rt.keyof({
  logs: null,
  metrics: null,
});

export const datasetRT = rt.exact(
  rt.type({
    name: rt.string,
    type: datasetTypesRT,
  })
);

export type Dataset = rt.TypeOf<typeof datasetRT>;

export const customIntegrationOptionsRT = rt.exact(
  rt.type({
    integrationName: integrationNameRT,
    datasets: rt.array(datasetRT),
  })
);

export type CustomIntegrationOptions = rt.TypeOf<typeof customIntegrationOptionsRT>;

export class IntegrationError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NamingCollisionError extends IntegrationError {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthorizationError extends IntegrationError {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnknownError extends IntegrationError {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DecodeError extends IntegrationError {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IntegrationNotInstalledError extends IntegrationError {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
