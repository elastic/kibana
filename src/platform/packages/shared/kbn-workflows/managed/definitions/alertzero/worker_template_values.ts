/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

export interface CommonWorkerTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
  /**
   * Agent that every `ai.agent` step in this Worker's chain runs as. Optional and
   * generic: any Worker may carry one, and a Worker with none is rendered exactly as
   * before. Sourced from the Worker's own settings, so no Worker id appears here.
   */
  agentId?: string;
}

/**
 * Substitutes the generic agent placeholder in two forms:
 *
 *   `__WORKER_AGENT_ID__`                  — no per-step default. Unset removes the whole
 *                                            line, because `agent-id: ""` is NOT equivalent
 *                                            to an omission: an empty string overrides the
 *                                            space's default agent with a nameless one.
 *   `__WORKER_AGENT_ID_OR:some-agent__`    — a step that already hardcoded an agent. Unset
 *                                            restores exactly that literal, so an existing
 *                                            Worker renders byte-identically to before.
 *
 * Substitution happens at INSTALL time, before any Liquid context exists, which is why the
 * default is carried in the placeholder rather than expressed as a `| default:` filter.
 */
const renderWorkerAgentId = (yaml: string, agentId?: string): string => {
  const chosen = agentId === undefined || agentId === '' ? undefined : agentId;
  const withDefaults = yaml.replace(
    /__WORKER_AGENT_ID_OR:([^_\s"]+)__/g,
    (_match, fallback: string) => chosen ?? fallback
  );
  return chosen === undefined
    ? withDefaults.replace(/^[^\S\n]*[^\n]*__WORKER_AGENT_ID__[^\n]*\n/gm, '')
    : withDefaults.replaceAll('__WORKER_AGENT_ID__', chosen);
};

export const renderCommonWorkerYaml = (
  yaml: string,
  { settingsVersion, autonomyLevel, agentId }: CommonWorkerTemplateValues
): string =>
  renderWorkerAgentId(
    yaml
      .replaceAll('__WORKER_SETTINGS_VERSION__', String(settingsVersion))
      .replaceAll('__WORKER_AUTONOMY_LEVEL__', autonomyLevel),
    agentId
  );

/**
 * Values for the subset of Workers that own a scheduled trigger. Kept out of
 * CommonWorkerTemplateValues because alert- and event-driven Workers have no schedule at all.
 */
export interface ScheduledWorkerTemplateValues extends CommonWorkerTemplateValues {
  scheduleInterval: string;
}

export const renderScheduledWorkerYaml = (
  yaml: string,
  values: ScheduledWorkerTemplateValues
): string =>
  renderCommonWorkerYaml(yaml, values).replaceAll(
    '__WORKER_SCHEDULE_INTERVAL__',
    values.scheduleInterval
  );

/**
 * Worker-specific settings are stored under `extras`, mirroring the Worker settings API, so a
 * settings save re-renders YAML and the per-space Worker can pass them to the sweep.
 */
export interface RuleTuningWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: {
    analysisWindowDays: number;
  };
}

export const renderRuleTuningWorkerYaml = (
  yaml: string,
  values: RuleTuningWorkerTemplateValues
): string =>
  renderScheduledWorkerYaml(yaml, values).replaceAll(
    '__WORKER_ANALYSIS_WINDOW_DAYS__',
    String(values.extras.analysisWindowDays)
  );
