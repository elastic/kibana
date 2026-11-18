/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';

/** Kept in sync with the header dropdown in core chrome. */
const WORKFLOW_SCENARIO_STORAGE_KEY = 'workflows.prototypeScenario';
const WORKFLOW_SCENARIO_EVENT = 'workflows:prototype-scenario';

export const EMPTY_WORKFLOW_LLM_DISABLED = 'empty-workflow-llm-disabled';
export const EMPTY_WORKFLOW_LLM_ENABLED = 'empty-workflow-llm-enabled';
export const EMPTY_WORKFLOW_AUTO_MIGRATION = 'empty-workflow-auto-migration';
export const NO_RESULTS_SEARCH_OR_FILTERS = 'no-results-search-or-filters';
export const EXECUTIONS_NO_RESULTS_SEARCH_OR_FILTERS = 'executions-no-results-search-or-filters';
export const EXECUTIONS_EMPTY = 'executions-empty';
export const EXECUTIONS_READ_ONLY = 'executions-read-only';
export const MANAGED_OFF_NO_CUSTOM = 'managed-workflows-off-no-custom';
export const READ_ONLY_NO_MANAGE = 'read-only-no-manage';

export const isPrototypeEmptyWorkflow = (scenario: string | null): boolean =>
  scenario === EMPTY_WORKFLOW_LLM_DISABLED ||
  scenario === EMPTY_WORKFLOW_LLM_ENABLED ||
  scenario === EMPTY_WORKFLOW_AUTO_MIGRATION;

const readScenario = (): string | null => {
  try {
    const stored = window.sessionStorage.getItem(WORKFLOW_SCENARIO_STORAGE_KEY);
    if (!stored || stored === 'old') return EMPTY_WORKFLOW_LLM_DISABLED;
    return stored;
  } catch {
    return EMPTY_WORKFLOW_LLM_DISABLED;
  }
};

export const useWorkflowPrototypeScenario = (): string | null => {
  const [scenario, setScenario] = useState<string | null>(readScenario);

  useEffect(() => {
    const onChange = () => setScenario(readScenario());
    window.addEventListener(WORKFLOW_SCENARIO_EVENT, onChange);
    return () => window.removeEventListener(WORKFLOW_SCENARIO_EVENT, onChange);
  }, []);

  return scenario;
};
