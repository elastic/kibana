/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord } from '../../types';

export interface LogDocument extends DataTableRecord {
  flattened: {
    '@timestamp': string;
    'log.level'?: [string];
    message?: [string];
    'error.message'?: string;
    'event.original'?: string;
    'host.name'?: string;
    'service.name'?: string;
    'trace.id'?: string;
    'agent.name'?: string;
    'orchestrator.cluster.name'?: string;
    'orchestrator.cluster.id'?: string;
    'orchestrator.resource.id'?: string;
    'orchestrator.namespace'?: string;
    'container.name'?: string;
    'container.id'?: string;
    'cloud.provider'?: string;
    'cloud.region'?: string;
    'cloud.availability_zone'?: string;
    'cloud.project.id'?: string;
    'cloud.instance.id'?: string;
    'log.file.path'?: string;
    'data_stream.namespace': string;
    'data_stream.dataset': string;

    'error.stack_trace'?: string;
    'error.exception.stacktrace.abs_path'?: string;
    'error.log.stacktrace.abs_path'?: string;
  };
}

export interface LogFlyoutDoc {
  '@timestamp': string;
  'log.level'?: string;
  message?: string;
  'error.message'?: string;
  'event.original'?: string;

  'host.name'?: string;
  'service.name'?: string;
  'trace.id'?: string;
  'agent.name'?: string;
  'orchestrator.cluster.name'?: string;
  'orchestrator.cluster.id'?: string;
  'orchestrator.resource.id'?: string;
  'orchestrator.namespace'?: string;
  'container.name'?: string;
  'cloud.provider'?: string;
  'cloud.region'?: string;
  'cloud.availability_zone'?: string;
  'cloud.project.id'?: string;
  'cloud.instance.id'?: string;
  'log.file.path'?: string;
  'data_stream.namespace': string;
  'data_stream.dataset': string;
}

export interface ResourceFields {
  'host.name'?: string;
  'service.name'?: string;
  'agent.name'?: string;
  'orchestrator.cluster.name'?: string;
  'orchestrator.cluster.id'?: string;
  'orchestrator.resource.id'?: string;
  'orchestrator.namespace'?: string;
  'container.name'?: string;
  'container.id'?: string;
  'cloud.instance.id'?: string;
}

export interface StackTraceFields {
  'error.stack_trace'?: string;
  'error.exception.stacktrace.abs_path'?: string;
  'error.log.stacktrace.abs_path'?: string;
}

export interface SmartFieldGridColumnOptions {
  type: 'smart-field';
  smartField: 'content' | 'resource';
  fallbackFields: string[];
  width?: number;
}
