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

// Static assertion for assignability back to the SDK types.
type AssignableTo<T extends U, U> = T;

// Return type for the `spotAgent` preset. Used as a step's `agents`.
export type AgentConfig = AssignableTo<
  Readonly<Record<string, string | number | boolean>>,
  AgentsObject
>;

export type Retry = NonNullable<SdkCommandStep['retry']>;

// The SDK lists `key`, `label`, and `agents` as optional, but we require them.
export type CommandStep = SdkCommandStep & { key: string; label: string; agents: AgentsObject };
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
