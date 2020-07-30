/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AuditTrailSetup, AuditTrailStart, Auditor } from './types';
import { AuditTrailService } from './audit_trail_service';

const createSetupContractMock = () => {
  const mocked: jest.Mocked<AuditTrailSetup> = {
    register: jest.fn(),
  };
  return mocked;
};

const createAuditorMock = () => {
  const mocked: jest.Mocked<Auditor> = {
    add: jest.fn(),
    withAuditScope: jest.fn(),
  };
  return mocked;
};

const createStartContractMock = () => {
  const mocked: jest.Mocked<AuditTrailStart> = {
    asScoped: jest.fn(),
  };
  mocked.asScoped.mockReturnValue(createAuditorMock());
  return mocked;
};

const createServiceMock = (): jest.Mocked<PublicMethodsOf<AuditTrailService>> => ({
  setup: jest.fn().mockResolvedValue(createSetupContractMock()),
  start: jest.fn().mockResolvedValue(createStartContractMock()),
  stop: jest.fn(),
});

export const auditTrailServiceMock = {
  create: createServiceMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createAuditorFactory: createStartContractMock,
  createAuditor: createAuditorMock,
};
