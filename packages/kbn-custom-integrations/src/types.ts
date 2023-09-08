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

const datasetTypes = rt.keyof({
  logs: null,
  metrics: null,
});

const dataset = rt.exact(
  rt.type({
    name: rt.string,
    type: datasetTypes,
  })
);

export type Dataset = rt.TypeOf<typeof dataset>;

export const customIntegrationOptionsRT = rt.exact(
  rt.type({
    integrationName: integrationNameRT,
    datasets: rt.array(dataset),
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
