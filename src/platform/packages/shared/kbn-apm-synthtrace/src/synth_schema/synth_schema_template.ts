/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file defines the core TypeScript interfaces for the declarative "Synth Schema".
 * This schema is used to define synthetic datasets in a declarative way, which can then
 * be used to generate data using the `synthtrace` tool.
 */

/**
 * The root object of the Synth Schema.
 */
export interface SynthSchema {
  /**
   * The time window for the generated data.
   */
  timeWindow: {
    from: string; // ISO 8601 date or relative time (e.g., "now-1h")
    to: string;
  };

  /**
   * An array of services to generate data for.
   */
  services?: ServiceConfig[];

  /**
   * An array of hosts to generate data for.
   */
  hosts?: HostConfig[];

  /**
   * An array of synthetics monitors to generate data for.
   */
  synthetics?: SyntheticsConfig[];
}

/**
 * Defines a service and the signals to generate for it.
 */
export interface ServiceConfig {
  id: string; // A unique ID for this service
  name: string;
  environment?: string;
  agentName?: string;
  instances: InstanceConfig[];
}

/**
 * Defines a host and the signals to generate for it.
 */
export interface HostConfig {
  id: string; // A unique ID for this host
  attributes?: Record<string, any>; // e.g., { "host.name": "my-host" }
  metrics?: MetricConfig[];
  logs?: LogConfig[];
}

/**
 * Defines an instance of a service.
 */
export interface InstanceConfig {
  id: string; // A unique ID for this instance
  host?: string; // The ID of the host this instance is running on
  traces?: TraceConfig[];
  logs?: LogConfig[];
  metrics?: MetricConfig[];
}

/**
 * Defines a set of traces to generate.
 */
export interface TraceConfig {
  id: string; // A unique ID for this set of traces
  name: string; // The name of the transaction
  count: number; // The number of traces to generate
  spans?: SpanConfig[];
  // ... other trace properties
}

/**
 * Defines a span within a trace.
 */
export interface SpanConfig {
  name: string;
  type: string;
  duration: { value: number; unit: 'ms' | 's' };
  // ... other span properties
}

/**
 * Defines a set of logs to generate.
 */
export interface LogConfig {
  level: 'info' | 'warn' | 'error';
  message: string;
  count: number;
  condition?: Condition;
  // ... other log properties
}

/**
 * Defines a set of metrics to generate.
 */
export interface MetricConfig {
  name: string;
  behavior: TimeVaryingValue;
  condition?: Condition;
  // ... other metric properties
}

/**
 * Defines a set of synthetics monitors to generate.
 */
export interface SyntheticsConfig {
  name: string;
  type: 'http' | 'browser';
  // ... other synthetics properties
}

/**
 * Defines a condition for generating an event.
 */
export type Condition =
  | {
      type: 'time';
      operator: '>=' | '<' | '=';
      value: string; // e.g., "75%"
    }
  | {
      type: 'metric';
      metric: string;
      operator: '>' | '<' | '=';
      value: number;
    };

/**
 * Defines a value that changes over time.
 */
export type TimeVaryingValue =
  | number
  | {
      type: 'linear';
      from: number;
      to: number;
    }
  | {
      type: 'piecewise';
      segments: Array<{
        from?: string; // e.g., "70%"
        to?: string; // e.g., "75%"
        value: TimeVaryingValue;
      }>;
    };
