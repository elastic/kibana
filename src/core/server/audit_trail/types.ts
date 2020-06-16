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
import { KibanaRequest } from '../http';

/**
 * Event to audit.
 * @public
 *
 * @remarks
 * Not a complete interface.
 */
export interface AuditableEvent {
  message: string;
  type: string;
}

export interface Auditor {
  add(event: AuditableEvent): void;
}

export interface AuditorFactory {
  asScoped(request: KibanaRequest): Auditor;
}

export interface InternalAuditTrailServiceSetup {
  register(auditor: AuditorFactory): void;
}

export type AuditTrailSetup = InternalAuditTrailServiceSetup;

export type InternalAuditTrailServiceStart = AuditorFactory;
