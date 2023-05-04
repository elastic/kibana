/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { ConfigSchema } from '../config';
import { elasticsearchServiceMock } from '../elasticsearch_service.mock';
import { kibanaConfigWriterMock } from '../kibana_config_writer.mock';
import { verificationCodeMock } from '../verification_code.mock';

export const routeDefinitionParamsMock = {
  create: (config: Record<string, unknown> = {}) => ({
    router: httpServiceMock.createRouter(),
    basePath: httpServiceMock.createBasePath(),
    csp: httpServiceMock.createSetupContract().csp,
    logger: loggingSystemMock.create().get(),
    preboot: { ...coreMock.createPreboot().preboot, completeSetup: jest.fn() },
    getConfig: jest.fn().mockReturnValue(ConfigSchema.validate(config)),
    elasticsearch: elasticsearchServiceMock.createSetup(),
    verificationCode: verificationCodeMock.create(),
    kibanaConfigWriter: kibanaConfigWriterMock.create(),
  }),
};
