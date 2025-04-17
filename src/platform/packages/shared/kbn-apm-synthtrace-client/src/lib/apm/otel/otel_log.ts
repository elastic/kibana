/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmOtelFields } from "./apm_otel_fields";
import { Serializable } from "../../serializable";

export enum LogLevel {
  TRACE = 1,
  TRACE2,
  TRACE3,
  TRACE4,
  DEBUG,
  DEBUG2,
  DEBUG3,
  DEBUG4,
  INFO,
  INFO2,
  INFO3,
  INFO4,
  WARN,
  WARN2,
  WARN3,
  WARN4,
  ERROR,
  ERROR2,
  ERROR3,
  ERROR4,
  FATAL,
  FATAL2,
  FATAL3,
  FATAL4,
}

export class OtelLog extends Serializable<ApmOtelFields> {
  constructor(fields: ApmOtelFields) {
    super({
      'data_stream.dataset': 'generic.otel',
      'data_stream.namespace': 'default',
      'data_stream.type': 'logs',
      ...fields,
    });
  }
}
