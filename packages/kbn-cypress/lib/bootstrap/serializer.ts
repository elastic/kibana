/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import _ from 'lodash';
import { customAlphabet } from 'nanoid';
import { CurrentsRunParameters, CypressRunParameters } from '../../types';
import { getCypressRunAPIParams } from '../config';
const debug = Debug('currents:boot');

const getDummySpec = customAlphabet('abcdefghijklmnopqrstuvwxyz', 10);

export function getBootstrapArgs({
  params,
  port,
  tempFilePath,
}: {
  params: CurrentsRunParameters;
  port: number;
  tempFilePath: string;
}) {
  return _.chain(getCypressCLIParams(params))
    .thru((opts) => ({
      ...opts,
      // merge the env with the currents specific env variables
      env: {
        ...(opts.env ?? {}),
        currents_temp_file: tempFilePath,
        currents_port: port,
        currents_debug_enabled: process.env.DEBUG?.includes('currents:') ? true : false,
      },
    }))
    .tap((opts) => {
      debug('cypress bootstrap params: %o', opts);
    })
    .thru(serializeOptions)
    .tap((opts) => {
      debug('cypress bootstrap serialized params: %o', opts);
    })
    .thru((args) => {
      return [
        ...args,
        // '--spec',
        // getDummySpec(),
        params.testingType === 'component' ? '--component' : '--e2e',
      ];
    })
    .value();
}

/**
 * Converts Currents options to Cypress CLI params.
 * Cypress CLI options are different from Cypress module API options.
 *
 * @param params Currents param
 * @returns Cypress CLI params
 * @see https://docs.cypress.io/guides/guides/command-line#cypress-run
 * @see https://docs.cypress.io/api/module-api
 */
function getCypressCLIParams(params: CurrentsRunParameters): CypressRunParameters {
  const result = getCypressRunAPIParams(params);
  const testingType =
    result.testingType === 'component'
      ? {
          component: true,
        }
      : {};
  return {
    ..._.omit(result, 'testingType'),
    ...testingType,
  };
}

function serializeOptions(options: Record<string, unknown>): string[] {
  return Object.entries(options).flatMap(([key, value]) => {
    const _key = dashed(key);
    if (typeof value === 'boolean') {
      return value === true ? [`--${_key}`] : [`--${_key}`, false];
    }

    if (_.isObject(value)) {
      return [`--${_key}`, serializeComplexParam(value)];
    }

    // @ts-ignore
    return [`--${_key}`, value.toString()];
  });
}

function serializeComplexParam(param: {}) {
  return JSON.stringify(param);
}

const dashed = (v: string) => v.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
