/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AgentsObject,
  CommandStep as SdkCommandStep,
  GroupStep as SdkGroupStep,
  PipelineSteps,
  WaitStep as SdkWaitStep,
} from '@buildkite/buildkite-sdk';
import type { MachineType } from './presets.ts';

// Static assertion for assignability back to the SDK types.
type AssignableTo<T extends U, U> = T;

// The agent attributes the library uses, so a misspelled key or value fails to compile. Add a key
// here when a step first uses it. The SDK's own `agents` is `Record<string, any>`.
interface AgentAttributes {
  readonly provider?: 'gcp' | 'k8s';
  readonly image?: string;
  readonly imageProject?: string;
  readonly imageUID?: number;
  readonly machineType?: MachineType;
  readonly preemptible?: boolean;
  readonly spotZones?: string;
  readonly zones?: string;
  readonly diskType?: 'hyperdisk-balanced' | 'pd-balanced';
  readonly diskSizeGb?: number;
  readonly enableNestedVirtualization?: boolean;
  readonly buildDirectory?: string;
}

export type AgentConfig = AssignableTo<AgentAttributes, AgentsObject>;

export type Retry = NonNullable<SdkCommandStep['retry']>;

// The SDK lists `key`, `label`, and `agents` as optional, but we require them.
export type CommandStep = Omit<SdkCommandStep, 'agents'> & {
  key: string;
  label: string;
  agents: AgentConfig;
};
export type GroupStep = SdkGroupStep & { key: string };

// Buildkite's schema allows `wait: null` (documented as `wait: ~`), but the
// generated type is lossy and only allows a string. This replaces that field
// with a required `wait: null`.
//
// NOTE: This makes the type *not* directly assignable to an SDK-typed slot,
// such as a group's `steps` field.
export type WaitStep = Omit<SdkWaitStep, 'wait'> & { wait: null };

// Escape hatch for full mechanical control. Use this as a last-resort if the
// other step-types do not fit your use-case. It is any step Buildkite's schema allows (the SDK's
// step union, which includes string forms such as 'wait'), with no required fields.
export type GenericStep = PipelineSteps[number];

export type Step = CommandStep | GroupStep | WaitStep | GenericStep;
