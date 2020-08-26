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
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { KibanaRequest, LegacyRequest } from '../http';
import { ensureRawRequest } from '../http/router';
import { Auditor, AuditorFactory, AuditTrailSetup, AuditTrailStart } from './types';

const defaultAuditorFactory: AuditorFactory = {
  asScoped() {
    return {
      add() {},
      withAuditScope() {},
    };
  },
};

export class AuditTrailService implements CoreService<AuditTrailSetup, AuditTrailStart> {
  private readonly log: Logger;
  private auditor: AuditorFactory = defaultAuditorFactory;
  private readonly auditors = new WeakMap<LegacyRequest, Auditor>();

  constructor(core: CoreContext) {
    this.log = core.logger.get('audit_trail');
  }

  setup() {
    return {
      register: (auditor: AuditorFactory) => {
        if (this.auditor !== defaultAuditorFactory) {
          throw new Error('An auditor factory has been already registered');
        }
        this.auditor = auditor;
        this.log.debug('An auditor factory has been registered');
      },
    };
  }

  start() {
    return {
      asScoped: (request: KibanaRequest) => {
        const key = ensureRawRequest(request);
        if (!this.auditors.has(key)) {
          this.auditors.set(key, this.auditor!.asScoped(request));
        }
        return this.auditors.get(key)!;
      },
    };
  }

  stop() {}
}
