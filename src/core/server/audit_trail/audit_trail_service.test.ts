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

import { AuditTrailService } from './audit_trail_service';
import { AuditorFactory } from './types';
import { mockCoreContext } from '../core_context.mock';
import { httpServerMock } from '../http/http_server.mocks';

describe('AuditTrailService', () => {
  const coreContext = mockCoreContext.create();

  describe('#setup', () => {
    describe('register', () => {
      it('throws if registered the same auditor factory twice', () => {
        const auditTrail = new AuditTrailService(coreContext);
        const { register } = auditTrail.setup();
        const auditorFactory: AuditorFactory = {
          asScoped() {
            return { add: () => undefined, withAuditScope: (() => {}) as any };
          },
        };
        register(auditorFactory);
        expect(() => register(auditorFactory)).toThrowErrorMatchingInlineSnapshot(
          `"An auditor factory has been already registered"`
        );
      });
    });
  });

  describe('#start', () => {
    describe('asScoped', () => {
      it('initialize every auditor with a request', () => {
        const scopedMock = jest.fn(() => ({ add: jest.fn(), withAuditScope: jest.fn() }));
        const auditorFactory = { asScoped: scopedMock };

        const auditTrail = new AuditTrailService(coreContext);
        const { register } = auditTrail.setup();
        register(auditorFactory);

        const { asScoped } = auditTrail.start();
        const kibanaRequest = httpServerMock.createKibanaRequest();
        asScoped(kibanaRequest);

        expect(scopedMock).toHaveBeenCalledWith(kibanaRequest);
      });

      it('passes auditable event to an auditor', () => {
        const addEventMock = jest.fn();
        const auditorFactory = {
          asScoped() {
            return { add: addEventMock, withAuditScope: jest.fn() };
          },
        };

        const auditTrail = new AuditTrailService(coreContext);
        const { register } = auditTrail.setup();
        register(auditorFactory);

        const { asScoped } = auditTrail.start();
        const kibanaRequest = httpServerMock.createKibanaRequest();
        const auditor = asScoped(kibanaRequest);
        const message = {
          type: 'foo',
          message: 'bar',
        };
        auditor.add(message);

        expect(addEventMock).toHaveBeenLastCalledWith(message);
      });

      describe('return the same auditor instance for the same KibanaRequest', () => {
        const auditTrail = new AuditTrailService(coreContext);
        auditTrail.setup();
        const { asScoped } = auditTrail.start();

        const rawRequest1 = httpServerMock.createKibanaRequest();
        const rawRequest2 = httpServerMock.createKibanaRequest();
        expect(asScoped(rawRequest1)).toBe(asScoped(rawRequest1));
        expect(asScoped(rawRequest1)).not.toBe(asScoped(rawRequest2));
      });
    });
  });
});
