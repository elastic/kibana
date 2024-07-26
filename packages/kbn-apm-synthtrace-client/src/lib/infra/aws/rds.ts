/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
import { Entity, Fields } from '../../entity';
import { Serializable } from '../../serializable';

export interface AWSRdsDocument extends Fields {
  'aws.rds.db_instance.arn': string;
  'aws.rds.db_instance.identifier': string;
  'metricset.name'?: string;
  'event.dataset'?: string;
}

export interface AWSRdsMetricsDocument extends AWSRdsDocument {
  'aws.rds.cpu.total.pct'?: number;
  'aws.rds.database_connections'?: number;
  'aws.rds.latency.dml'?: number;
  'aws.rds.latency.read'?: number;
  'aws.rds.latency.write'?: number;
  'aws.rds.latency.insert'?: number;
  'aws.rds.latency.update'?: number;
  'aws.rds.latency.commit'?: number;
  'aws.rds.queries'?: number;
}

class AWSRdsMetrics extends Serializable<AWSRdsMetricsDocument> {}

export class AWSRds extends Entity<AWSRdsDocument> {
  metrics(metricsFields: AWSRdsMetricsDocument) {
    return new AWSRdsMetrics({
      ...this.fields,
      ...metricsFields,
    });
  }
}

export function awsRds(arn: string, name: string): AWSRds {
  return new AWSRds({
    'aws.rds.db_instance.arn': arn,
    'aws.rds.db_instance.identifier': name,
    'event.dataset': 'aws.rds',
  });
}
