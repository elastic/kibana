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
import { mockCoreContext } from '../core_context.mock';
import { httpServerMock } from '../http/http_server.mocks';

describe('AuditTrailService', () => {
  const coreContext = mockCoreContext.create();

  describe('#setup', () => {
    describe('register', () => {
      it('throws if registered the same auditor factory twice', () => {
        const auditTrail = new AuditTrailService(coreContext);
        const { register } = auditTrail.setup();
        const auditorFactory = {
          asScoped() {
            return { add: () => undefined };
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
        const scopedMockOne = jest.fn(() => ({ add: () => undefined }));
        const auditorFactoryOne = { asScoped: scopedMockOne };
        const scopedMockTwo = jest.fn(() => ({ add: () => undefined }));
        const auditorFactoryTwo = { asScoped: scopedMockTwo };

        const auditTrail = new AuditTrailService(coreContext);
        const { register } = auditTrail.setup();
        register(auditorFactoryOne);
        register(auditorFactoryTwo);

        const { asScoped } = auditTrail.start();
        const kibanaRequest = httpServerMock.createKibanaRequest();
        asScoped(kibanaRequest);

        expect(scopedMockOne).toHaveBeenCalledWith(kibanaRequest);
        expect(scopedMockTwo).toHaveBeenCalledWith(kibanaRequest);
      });

      it('passes auditable event to every auditor', () => {
        const addEventMockOne = jest.fn();
        const auditorFactoryOne = {
          asScoped() {
            return { add: addEventMockOne };
          },
        };
        const addEventMockTwo = jest.fn();
        const auditorFactoryTwo = {
          asScoped() {
            return { add: addEventMockTwo };
          },
        };

        const auditTrail = new AuditTrailService(coreContext);
        const { register } = auditTrail.setup();
        register(auditorFactoryOne);
        register(auditorFactoryTwo);

        const { asScoped } = auditTrail.start();
        const kibanaRequest = httpServerMock.createKibanaRequest();
        const auditor = asScoped(kibanaRequest);
        const message = {
          type: 'foo',
          message: 'bar',
        };
        auditor.add(message);

        expect(addEventMockOne).toHaveBeenLastCalledWith(message);
        expect(addEventMockTwo).toHaveBeenLastCalledWith(message);
      });
    });
  });
});
