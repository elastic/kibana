/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../../../dsl/fields';
import { Signal } from '../../../dsl/signal';
import { ApmFields } from '../../../dsl/apm/apm_fields';
import { dataStream, WriteTarget } from '../../../dsl/write_target';

export type ServiceMetricsFields = Fields &
  Pick<
    ApmFields,
    | 'timestamp.us'
    | 'ecs.version'
    | 'metricset.name'
    | 'observer'
    | 'processor.event'
    | 'processor.name'
    | 'service.name'
    | 'service.version'
    | 'service.environment'
  > &
  Partial<{
    _doc_count: number;
    transaction: {
      failure_count: number;
      success_count: number;
      type: string;
      'duration.summary': {
        min: number;
        max: number;
        sum: number;
        value_count: number;
      };
    };
  }>;

export class ServiceMetrics extends Signal<ServiceMetricsFields> {
  constructor(fields: ServiceMetricsFields) {
    super(fields);
  }
  getWriteTarget(): WriteTarget | undefined {
    return dataStream('metrics-apm.service-default');
  }
}
