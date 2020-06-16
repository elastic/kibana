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
import { KibanaRequest } from '../http';
import {
  AuditorFactory,
  AuditableEvent,
  InternalAuditTrailServiceSetup,
  InternalAuditTrailServiceStart,
} from './types';

export class AuditTrailService
  implements CoreService<InternalAuditTrailServiceSetup, InternalAuditTrailServiceStart> {
  private readonly log: Logger;
  private readonly auditors: Set<AuditorFactory> = new Set();

  constructor(core: CoreContext) {
    this.log = core.logger.get('audit_trail');
  }

  setup() {
    return {
      register: (auditor: AuditorFactory) => {
        if (this.auditors.has(auditor)) {
          throw new Error('An auditor factory has been already registered');
        }
        this.auditors.add(auditor);
        this.log.debug('An auditor factory has been registered');
      },
    };
  }

  start() {
    return {
      asScoped: (request: KibanaRequest) => {
        const scopedAuditors = [...this.auditors].map((a) => a.asScoped(request));
        return {
          add: (event: AuditableEvent) => {
            scopedAuditors.forEach((a) => a.add(event));
          },
        };
      },
    };
  }

  stop() {}
}
