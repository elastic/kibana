/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '../../../types/v1';
export type ManagedWorkflowFieldsSource = Pick<
  EsWorkflowExecution,
  'managed' | 'managedBy' | 'billable' | 'originManagedWorkflowId' | 'managedVersion'
>;
export interface ManagedWorkflowFields {
  managed?: true;
  managedBy?: string;
  billable?: boolean;
  originManagedWorkflowId?: string;
  managedVersion?: number;
}
/**
 * Strips null managed-workflow fields for execution, API, and persistence payloads.
 */
export declare const pickManagedWorkflowFields: (
  source: ManagedWorkflowFieldsSource | null | undefined
) => Partial<ManagedWorkflowFields>;
export interface ManagedWorkflowTelemetryFields {
  isManaged: boolean;
  managedBy?: string;
  originManagedWorkflowId?: string;
  managedVersion?: number;
}
/**
 * Maps managed-workflow source fields to telemetry event shape.
 */
export declare const toManagedWorkflowTelemetryFields: (
  source: ManagedWorkflowFieldsSource | null | undefined
) => ManagedWorkflowTelemetryFields;
