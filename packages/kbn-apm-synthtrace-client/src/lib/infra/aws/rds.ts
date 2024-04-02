/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
import { AWSRedisAsset } from '../../assets';
import { Entity, Fields } from '../../entity';
import { Serializable } from '../../serializable';

interface AWSRdsDocument extends Fields {
  'aws.rds.db_instance.arn': string;
  'aws.rds.db_instance.identifier': string;
  'metricset.name'?: string;
  'event.dataset'?: string;
}

export class AWSRds extends Entity<AWSRdsDocument> {
  metrics() {
    return new AWSRdsMetrics({
      ...this.fields,
      'aws.rds.cpu.total.pct': 0.4,
      'aws.rds.database_connections': 5,
      'aws.rds.latency.read': 500 * 1000,
      'aws.rds.latency.write': 500 * 1000,
      'aws.rds.latency.insert': 500 * 1000,
      'aws.rds.latency.update': 500 * 1000,
      'aws.rds.latency.commit': 500 * 1000,
      'aws.rds.latency.dml': 500 * 1000,
      'aws.rds.queries': 100,
      'event.dataset': 'aws.rds',
    });
  }

  asset() {
    return new AWSRedisAsset({
      'asset.kind': 'aws_rds',
      'asset.id': this.fields['aws.rds.db_instance.arn'],
      'asset.name': this.fields['aws.rds.db_instance.identifier'],
      'asset.ean': `aws_rds:${'aws.rds.db_instance.arn'}`,
    });
  }
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

export function awsRds(arn: string, name: string): AWSRds {
  return new AWSRds({
    'aws.rds.db_instance.arn': arn,
    'aws.rds.db_instance.identifier': name,
  });
}
