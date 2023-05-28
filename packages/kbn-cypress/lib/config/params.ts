/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import _ from 'lodash';
import {
  CurrentsRunParameters,
  CypressRunParameters,
  ValidatedCurrentsParameters,
} from '../../types';
import { ValidationError } from '../errors';
import { error } from '../log';
import { getCurrentsConfig } from './config';
const debug = Debug('currents:validateParams');

export function resolveCurrentsParams(params: CurrentsRunParameters): CurrentsRunParameters {
  const configFromFile = getCurrentsConfig(params.project);

  const cloudServiceUrl =
    params.cloudServiceUrl ?? process.env.CURRENTS_API_URL ?? configFromFile.cloudServiceUrl;

  const recordKey = params.recordKey ?? process.env.CURRENTS_RECORD_KEY ?? configFromFile.recordKey;

  const projectId = params.projectId ?? process.env.CURRENTS_PROJECT_ID ?? configFromFile.projectId;

  const testingType = params.testingType ?? 'e2e';

  const batchSize =
    testingType === 'e2e' ? configFromFile.e2e.batchSize : configFromFile.component.batchSize;

  // batchSize and cloudServiceUrl defaults are in getCurrentsConfig()
  return {
    ...params,
    cloudServiceUrl,
    recordKey,
    projectId,
    batchSize,
    testingType,
  };
}

export const projectIdError = `Cannot resolve projectId. Please use one of the following:
- provide it as a "projectId" property for "run" API method
- set CURRENTS_PROJECT_ID environment variable
- set "projectId" in "currents.config.js" file`;

export const cloudServiceUrlError = `Cannot resolve cloud service URL. Please use one of the following:
- provide it as a "cloudServiceUrl" property for "run" API method
- set CURRENTS_API_URL environment variable
- set "cloudServiceUrl" in "currents.config.js" file`;

export const cloudServiceInvalidUrlError = `Invalid cloud service URL provided`;

export const recordKeyError = `Cannot resolve record key. Please use one of the following:

- pass it as a CLI flag '-k, --key <record-key>'
- provide it as a "recordKey" property for "run" API method
- set CURRENTS_RECORD_KEY environment variable
- set "recordKey" in "currents.config.js" file
`;

export function validateParams(_params: CurrentsRunParameters): ValidatedCurrentsParameters {
  const params = resolveCurrentsParams(_params);

  if (!params.cloudServiceUrl) {
    throw new ValidationError(cloudServiceUrlError);
  }
  if (!params.projectId) {
    throw new ValidationError(projectIdError);
  }
  if (!params.recordKey) {
    throw new ValidationError(recordKeyError);
  }

  validateURL(params.cloudServiceUrl);

  const requiredParameters: Array<keyof CurrentsRunParameters> = [
    'testingType',
    'batchSize',
    'projectId',
  ];
  requiredParameters.forEach((key) => {
    if (typeof params[key] === 'undefined') {
      error('Missing required parameter "%s"', key);
      throw new Error('Missing required parameter');
    }
  });

  params.tag = parseTags(params.tag);
  params.autoCancelAfterFailures = getAutoCancelValue(params.autoCancelAfterFailures);

  debug('validated currents params: %o', params);

  // TODO: remove this cast after finding a way to properly resolve params type after validations
  return params as ValidatedCurrentsParameters;
}

function getAutoCancelValue(value: unknown): number | false | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : false;
  }

  if (typeof value === 'number' && value > 0) {
    return value;
  }

  throw new ValidationError(
    `autoCancelAfterFailures: should be a positive integer or "false". Got: "${value}"`
  );
}

export function isOffline(params: CurrentsRunParameters) {
  return params.record === false;
}

function parseTags(tagString: CurrentsRunParameters['tag']): string[] {
  if (!tagString) {
    return [];
  }
  if (Array.isArray(tagString)) {
    return tagString.filter(Boolean);
  }
  return tagString
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateURL(url: string): void {
  try {
    new URL(url);
  } catch (err) {
    throw new ValidationError(`${cloudServiceInvalidUrlError}: "${url}"`);
  }
}

/**
 *
 * @returns Cypress options without items that affect recording mode
 */
export function getCypressRunAPIParams(params: CurrentsRunParameters): CypressRunParameters {
  return {
    ..._.pickBy(
      _.omit(params, [
        'autoCancelAfterFailures',
        'cloudServiceUrl',
        'batchSize',
        'projectId',
        'key',
        'recordKey',
        'record',
        'group',
        'parallel',
        'tag',
        'ciBuildId',
        'spec',
        'exit',
        'headed',
        'headless',
      ]),
      Boolean
    ),
    record: false,
  };
}

export function preprocessParams(params: CurrentsRunParameters): CurrentsRunParameters {
  return {
    ...params,
    spec: processSpecParam(params.spec),
  };
}

function processSpecParam(spec: CurrentsRunParameters['spec']): string[] | undefined {
  if (!spec) {
    return undefined;
  }

  if (Array.isArray(spec)) {
    return _.flatten(spec.map((i) => i.split(',')));
  }

  return spec.split(',');
}
