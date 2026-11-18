/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';

/**
 * Prototype switcher for Workflows empty states.
 * The workflows app reads the same sessionStorage key and window event.
 */
export const WORKFLOW_SCENARIO_STORAGE_KEY = 'workflows.prototypeScenario';
export const WORKFLOW_SCENARIO_EVENT = 'workflows:prototype-scenario';
export const EMPTY_WORKFLOW_LLM_DISABLED = 'empty-workflow-llm-disabled';
const EMPTY_WORKFLOW_LLM_ENABLED = 'empty-workflow-llm-enabled';
const EMPTY_WORKFLOW_AUTO_MIGRATION = 'empty-workflow-auto-migration';
const NO_RESULTS_SEARCH_OR_FILTERS = 'no-results-search-or-filters';
const EXECUTIONS_EMPTY = 'executions-empty';
const EXECUTIONS_NO_RESULTS_SEARCH_OR_FILTERS = 'executions-no-results-search-or-filters';
const EXECUTIONS_READ_ONLY = 'executions-read-only';
const MANAGED_OFF_NO_CUSTOM = 'managed-workflows-off-no-custom';
const READ_ONLY_NO_MANAGE = 'read-only-no-manage';

const WORKFLOW_SCENARIOS = [
  { id: EMPTY_WORKFLOW_LLM_DISABLED, label: 'Workflow Empty (LLM Disabled)' },
  { id: EMPTY_WORKFLOW_LLM_ENABLED, label: 'Workflow Empty (LLM Enabled)' },
  { id: EMPTY_WORKFLOW_AUTO_MIGRATION, label: 'Empty state with auto migration' },
  { id: MANAGED_OFF_NO_CUSTOM, label: 'Managed workflows off, no custom workflows' },
  { id: NO_RESULTS_SEARCH_OR_FILTERS, label: 'No results for search or filters' },
  { id: READ_ONLY_NO_MANAGE, label: 'No permission to manage workflows' },
] as const;

/** Fits the longest label, "Managed workflows off, no custom workflows", plus the check icon. */
const SCENARIO_MENU_WIDTH = 380;

const EXECUTION_SCENARIOS = [
  { id: EXECUTIONS_EMPTY, label: 'Execution empty', dropSearch: true },
  {
    id: EXECUTIONS_NO_RESULTS_SEARCH_OR_FILTERS,
    label: 'No results for search or filters',
    dropSearch: false,
  },
  { id: EXECUTIONS_READ_ONLY, label: 'No permission to manage executions', dropSearch: true },
] as const;

const workflowsAppPath = (path: '' | '/executions') => {
  const marker = '/app/workflows';
  const index = window.location.pathname.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return `${window.location.pathname.slice(0, index)}${marker}${path}`;
};

const clearStoredExecutionFilters = () => {
  try {
    window.localStorage.removeItem('workflows.executions.pageFilters');
  } catch {
    // Local storage can be blocked. The clean URL still opens Executions.
  }
};

const goToWorkflowsPath = (path: '' | '/executions', dropSearch = false) => {
  const next = workflowsAppPath(path);
  if (!next) {
    return;
  }
  const target = dropSearch ? next : `${next}${window.location.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) {
    return;
  }
  window.location.assign(target);
};

const readScenario = (): string | null => {
  try {
    const stored = window.sessionStorage.getItem(WORKFLOW_SCENARIO_STORAGE_KEY);
    if (!stored || stored === 'old') return EMPTY_WORKFLOW_LLM_DISABLED;
    return stored;
  } catch {
    return EMPTY_WORKFLOW_LLM_DISABLED;
  }
};

const writeScenario = (id: string | null) => {
  try {
    if (id) {
      window.sessionStorage.setItem(WORKFLOW_SCENARIO_STORAGE_KEY, id);
    } else {
      window.sessionStorage.removeItem(WORKFLOW_SCENARIO_STORAGE_KEY);
    }
  } catch {
    // Session storage can be blocked. The in-memory click still updates this menu.
  }
  window.dispatchEvent(new CustomEvent(WORKFLOW_SCENARIO_EVENT));
};

export const WorkflowScenarioDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(() => readScenario());

  const selectScenario = (id: string, path: '' | '/executions', dropSearch = false) => {
    writeScenario(id);
    setSelected(id);
    setIsOpen(false);
    if (dropSearch) {
      clearStoredExecutionFilters();
    }
    goToWorkflowsPath(path, dropSearch);
  };

  return (
    <EuiPopover
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          aria-label="Empty States"
          data-test-subj="workflowScenarioDropdown"
          onClick={() => setIsOpen((open) => !open)}
        >
          Empty States
        </EuiButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu
        key={isOpen ? 'open' : 'closed'}
        initialPanelId={0}
        panels={[
          {
            id: 0,
            width: SCENARIO_MENU_WIDTH,
            title: 'Empty States',
            items: [
              {
                name: 'Workflows',
                panel: 1,
                'data-test-subj': 'workflowScenario-workflows',
              },
              {
                name: 'Executions',
                panel: 2,
                'data-test-subj': 'workflowScenario-executions',
              },
            ],
          },
          {
            id: 1,
            width: SCENARIO_MENU_WIDTH,
            title: 'Workflows',
            items: WORKFLOW_SCENARIOS.map((scenario) => ({
              name: <span style={{ whiteSpace: 'nowrap' }}>{scenario.label}</span>,
              icon: selected === scenario.id ? 'check' : 'empty',
              onClick: () => selectScenario(scenario.id, ''),
              'data-test-subj': `workflowScenario-${scenario.id}`,
            })),
          },
          {
            id: 2,
            width: SCENARIO_MENU_WIDTH,
            title: 'Executions',
            items: EXECUTION_SCENARIOS.map((scenario) => ({
              name: <span style={{ whiteSpace: 'nowrap' }}>{scenario.label}</span>,
              icon: selected === scenario.id ? 'check' : 'empty',
              onClick: () => selectScenario(scenario.id, '/executions', scenario.dropSearch),
              'data-test-subj': `executionScenario-${scenario.id}`,
            })),
          },
        ]}
      />
    </EuiPopover>
  );
};
