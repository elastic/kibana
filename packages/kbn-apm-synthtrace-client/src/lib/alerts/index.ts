/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */
import { Entity, Fields } from '../entity';
import { Serializable } from '../serializable';

interface AlertDocument extends Fields {
  'kibana.alert.reason'?: string;
  'kibana.alert.evaluation.threshold'?: number[];
  'kibana.alert.rule.category'?: string;
  'kibana.alert.rule.consumer'?: string;
  'kibana.alert.rule.execution.uuid'?: string;
  'kibana.alert.rule.name'?: string;
  'kibana.alert.rule.producer'?: string;
  'kibana.alert.rule.revision'?: number;
  'kibana.alert.rule.uuid'?: string;
  'kibana.space_ids'?: string[];
  'event.action'?: string;
  'event.kind'?: string;
  'kibana.alert.rule.execution.timestamp'?: number;
  'kibana.alert.action_group'?: string;
  'kibana.alert.flapping'?: boolean;
  'kibana.alert.flapping_history'?: string;
  'kibana.alert.instance.id'?: string;
  'kibana.alert.maintenance_window_ids'?: string;
  'kibana.alert.status'?: string;
  'kibana.alert.uuid'?: string;
  'kibana.alert.workflow_status'?: string;
  'kibana.alert.duration.us'?: number;
  tags?: string[];
}

export interface AlertInfraDocument extends AlertDocument {
  'kibana.alert.evaluation.values'?: number[];
  'cloud.availability_zone'?: string;
  'cloud.instance.id'?: string;
  'cloud.instance.name'?: string;
  'cloud.provider'?: string;
  'cloud.machine.type'?: string;
  'cloud.project.id'?: string;
  'cloud.region'?: string;
  'host.hostname'?: string;
  'host.os.platform'?: string;
  'host.ip'?: string;
  'host.name'?: string;
  'host.architecture'?: string;
  'kibana.alert.start'?: number | string;
  'kibana.alert.time_range': {
    gte: number | string;
    lte?: number | string;
  };
}

export interface AlertApmDocument extends AlertDocument {
  'processor.event'?: string;
  'kibana.alert.evaluation.value'?: number;
  'agent.name'?: string;
  labels?: { custom_labels?: string[] };
  'service.environment'?: string;
  'service.name'?: string;
  'transaction.type'?: string;
}

export type AlertEntityDocument = AlertInfraDocument | AlertApmDocument;

class AlertInfra extends Serializable<AlertInfraDocument> {}
class AlertApm extends Serializable<AlertApmDocument> {}

class Alert extends Entity<AlertDocument> {
  host({ hostName, from, to }: { hostName: string; from: string; to: string }) {
    return new AlertInfra({
      ...this.fields,
      // 'kibana.alert.evaluation.values': [0.92],
      // 'cloud.availability_zone': 'us-west-1',
      // 'cloud.instance.id': 'instance-id',
      // 'cloud.instance.name': 'instance-name',
      // 'cloud.provider': 'aws',
      // 'cloud.machine.type': 't2.micro',
      // 'cloud.project.id': 'project-id',
      // 'cloud.region': 'us-west-1',
      // 'host.hostname': hostName,
      // 'host.os.platform': 'linux',
      // 'host.ip': 'sjsjsjj',
      'host.name': hostName,
      'kibana.alert.start': from,
      'kibana.alert.time_range': {
        gte: from,
        lte: to,
      },
      // 'host.architecture': 'x86_64',
    });
  }

  apm(serviceName: string) {
    return new AlertApm({
      ...this.fields,
      'processor.event': 'transaction',
      'kibana.alert.evaluation.value': 0.5,
      'agent.name': 'nodejs',
      labels: { custom_labels: ['label1', 'label2'] },
      'service.environment': 'production',
      'service.name': serviceName,
      'transaction.type': 'type',
    });
  }
}

export function alert({
  category,
  consumer,
  producer,
}: {
  category: string;
  consumer: string;
  producer: string;
}) {
  return new Alert({
    'kibana.alert.reason': 'CPU usage is 91.5% in the last 1 min for host. Alert when above 50%.',
    'kibana.alert.evaluation.threshold': [50],
    'kibana.alert.rule.category': category,
    'kibana.alert.rule.consumer': consumer,
    'kibana.alert.rule.name': 'Inventory threshold',
    'kibana.alert.rule.producer': producer,
    // 'kibana.alert.rule.revision': 0,
    // 'kibana.space_ids': ['default'],
    // 'event.action': 'active',
    // 'event.kind': 'signal',
    // 'kibana.alert.rule.execution.timestamp': timestamp,
    // 'kibana.alert.action_group': 'metrics.inventory_threshold.fired',
    // 'kibana.alert.instance.id': 'instance',
    // 'kibana.alert.maintenance_window_ids': 'window',
    'kibana.alert.status': 'active',
    'kibana.alert.uuid': 'ef596789-5be3-45ad-91b4-e6b463ae06e2',
    // 'kibana.alert.workflow_status': 'workflow',
    // 'kibana.alert.duration.us': 1000,
    tags: [],
  });
}
