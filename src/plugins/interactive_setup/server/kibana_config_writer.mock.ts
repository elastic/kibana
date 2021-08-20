/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { KibanaConfigWriter } from './kibana_config_writer';

export const kibanaConfigWriterMock = {
  create: (): jest.Mocked<PublicMethodsOf<KibanaConfigWriter>> => ({
    isConfigWritable: jest.fn().mockResolvedValue(true),
    writeConfig: jest.fn().mockResolvedValue(undefined),
  }),
};
