/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';

export interface LogDocument extends Fields {
  'input.type': string;
  'log.file.path'?: string;
  'service.name': string;
  'data_stream.namespace': string;
  'data_stream.type': string;
  'data_stream.dataset': string;
  message?: string;
  'event.dataset': string;
  'log.level'?: string;
}

class Log extends Serializable<LogDocument> {
  service(name: string) {
    this.fields['service.name'] = name;
    return this;
  }

  namespace(value: string) {
    this.fields['data_stream.namespace'] = value;
    return this;
  }

  dataset(value: string) {
    this.fields['data_stream.dataset'] = value;
    this.fields['event.dataset'] = value;
    return this;
  }

  logLevel(level: string) {
    this.fields['log.level'] = level;
    return this;
  }

  message(message: string) {
    this.fields.message = message;
    return this;
  }
}

function service(serviceName: string = 'synth-service'): Log {
  return new Log({
    'input.type': 'logs',
    'service.name': serviceName,
    'data_stream.namespace': 'default',
    'data_stream.type': 'logs',
    'data_stream.dataset': 'synth',
    'event.dataset': 'synth',
  });
}

export const log = {
  service,
};
