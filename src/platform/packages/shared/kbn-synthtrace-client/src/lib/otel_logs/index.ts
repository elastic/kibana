/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Fields } from '../entity';
import { Serializable } from '../serializable';

export const LONG_FIELD_NAME =
  'thisisaverylongfieldnamethatevendoesnotcontainanyspaceswhyitcouldpotentiallybreakouruiinseveralplaces';

export interface OtelScope {
  name: string;
  version?: string;
  attributes?: Record<string, unknown>;
}

export type OtelLogDocument = Fields &
  Partial<{
    _index?: string;
    event_name?: string;
    scope?: OtelScope;
    trace_id?: string;
    span_id?: string;
    attributes?: Record<string, unknown>;
    severity_text?: string;
    severity_number?: number;
    resource?: {
      attributes?: Record<string, unknown>;
    };
    body?: {
      text?: string;
      structured?: Record<string, unknown>;
    };
    flags?: number;
    observed_timestamp?: number;
  }>;

export class OtelLog extends Serializable<OtelLogDocument> {
  constructor(fields: OtelLogDocument) {
    super({
      ...fields,
    });
  }

  private setResourceAttributeField(fieldName: string, value: string | number | boolean | null) {
    this.fields.resource = {
      ...this.fields.resource,
      attributes: {
        ...this.fields.resource?.attributes,
        [fieldName]: value,
      },
    };
  }

  service(name: string) {
    this.setResourceAttributeField('service.name', name);
    return this;
  }

  hostName(name: string) {
    this.setResourceAttributeField('host.name', name);
    return this;
  }

  containerId(id: string) {
    this.setResourceAttributeField('container.id', id);
    return this;
  }

  logLevel(level: string) {
    this.fields.severity_text = level;
    return this;
  }

  eventName(name: string) {
    this.fields.event_name = name;
    return this;
  }

  severity(severityNumber: number, severityText?: string) {
    this.fields.severity_number = severityNumber;
    if (severityText !== undefined) {
      this.fields.severity_text = severityText;
    }
    return this;
  }

  scope(scope: OtelScope) {
    this.fields.scope = scope;
    return this;
  }

  message(message: string) {
    this.fields.body = {
      ...this.fields.body,
      text: message,
    };
    return this;
  }

  setHostIp(hostIp: string) {
    this.setResourceAttributeField('host.ip', hostIp);
    return this;
  }

  timestamp(time: number) {
    super.timestamp(time);
    return this;
  }

  addAttributes(attributes: Record<string, unknown>) {
    this.fields.attributes = {
      ...this.fields.attributes,
      ...attributes,
    };
    return this;
  }

  addResourceAttributes(attributes: Record<string, unknown>) {
    this.fields.resource = {
      ...this.fields.resource,
      attributes: {
        ...this.fields.resource?.attributes,
        ...attributes,
      },
    };
    return this;
  }

  deleteField(fieldName: keyof OtelLogDocument) {
    delete this.fields[fieldName];
    return this;
  }
}

function create(): OtelLog {
  return new OtelLog({
    _index: 'logs-generic.otel-default',
  });
}

function createForIndex(index: string): OtelLog {
  return new OtelLog({
    _index: index,
  });
}

export const otelLog = {
  create,
  createForIndex,
};
