/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Define enums for each "app"
enum App {
  INFRA = 'infra',
  APM = 'apm',
  SYNTHETICS = 'synthetics',
}

enum APMRouting {
  SERVICES = 'services',
  SERVICE_DETAILS = 'serviceDetails',
}

enum InfraRouting {
  HOST = 'hosts',
  host_details = 'hostDetails',
}

enum AvailableComponents {
  CHART = 'chart',
  TABLE = 'table',
}

// You can add more specific tracking components as needed
type TargetComponent = string;
type Details = string;

// Define a type to represent the attribute name
type ApmTargetId = `${App.APM}.${APMRouting}.${AvailableComponents}.${TargetComponent}.${Details}`;
type InfaTargetId =
  `${App.INFRA}.${InfraRouting}.${AvailableComponents}.${TargetComponent}.${Details}__${Phase}`;

export interface WithRenderTimeProps {
  targetId: ApmTargetId | InfaTargetId;
  onEndTracking: boolean;
  onStartTracking?: boolean;
}

export type Phase = 'mounted' | 'updated';
