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

export type OtelLogDocument = Fields &
  Partial<{
    _index?: string;
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

class OtelLog extends Serializable<OtelLogDocument> {
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
