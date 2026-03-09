/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Decorator, Meta, StoryContext, StoryObj } from '@storybook/react';
import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import type { monaco } from '@kbn/monaco';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ProposedChange } from './proposed_changes';
import { ProposalManager } from './proposed_changes';
import { kibanaReactDecorator } from '../../../.storybook/decorators';
import {
  setActiveTab,
  setYamlString,
  WorkflowDetailStoreProvider,
} from '../../entities/workflows/store';
import type { AppDispatch } from '../../entities/workflows/store/store';
import { WorkflowYAMLEditor } from '../../widgets/workflow_yaml_editor/ui/workflow_yaml_editor';

const storyQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const SAMPLE_YAML = `name: GitHub issue search
enabled: true
triggers:
  - type: manual
consts:
  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"
  # slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

steps:
  - name: fetch_issues
    type: http.request
    with:
      method: GET
      url: "{{ consts.github_search_url }}"
      headers:
        Accept: "application/vnd.github.v3+json"

  - name: log_count
    type: console
    with:
      message: "Found {{ steps.fetch_issues.output.total_count }} open PRs"

  - name: iterate_issues
    type: foreach
    foreach: steps.fetch_issues.output.items
    steps:
      - name: log_issue
        type: console
        with:
          message: "#{{ steps.iterate_issues.item.number }} - {{ steps.iterate_issues.item.title }}"
`;

const INSERT_PROPOSAL: ProposedChange = {
  proposalId: 'insert-step',
  type: 'insert',
  startLine: 32,
  newText: `  - name: notify_slack
    type: slack
    connector-id: my-slack
    with:
      message: "Found {{ steps.fetch_issues.output.total_count }} open PRs for One Workflow"
`,
};

const REPLACE_PROPOSAL: ProposedChange = {
  proposalId: 'replace-line',
  type: 'replace',
  startLine: 6,
  endLine: 6,
  newText:
    '  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"',
};

const DELETE_PROPOSAL: ProposedChange = {
  proposalId: 'delete-comment',
  type: 'delete',
  startLine: 7,
  endLine: 7,
  newText: '',
};

interface EditorWithProposalsProps {
  proposals: ProposedChange[];
  onStepRun: (params: { stepId: string; actionType: string }) => void;
}

const EditorWithProposals: React.FC<EditorWithProposalsProps> = ({ proposals, onStepRun }) => {
  const dispatch = useDispatch<AppDispatch>();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const managerRef = useRef<ProposalManager | null>(null);
  const proposalsApplied = useRef(false);

  useEffect(() => {
    dispatch(setYamlString(SAMPLE_YAML));
    dispatch(setActiveTab('workflow'));
  }, [dispatch]);

  useEffect(() => {
    if (proposalsApplied.current) return;

    const interval = setInterval(() => {
      const editor = editorRef.current;
      if (!editor?.getModel()) return;

      clearInterval(interval);
      proposalsApplied.current = true;

      const manager = new ProposalManager();
      manager.initialize(editor);
      managerRef.current = manager;

      for (const proposal of proposals) {
        manager.proposeChange(proposal);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      managerRef.current?.dispose();
      managerRef.current = null;
      proposalsApplied.current = false;
    };
  }, [proposals]);

  return <WorkflowYAMLEditor editorRef={editorRef} onStepRun={onStepRun} />;
};

const StoryProviders: Decorator = (story: () => React.ReactElement, _context: StoryContext) => (
  <QueryClientProvider client={storyQueryClient}>
    <MemoryRouter>
      <WorkflowDetailStoreProvider>
        <div css={{ height: '600px', display: 'flex', flexDirection: 'column' }}>{story()}</div>
      </WorkflowDetailStoreProvider>
    </MemoryRouter>
  </QueryClientProvider>
);

const meta: Meta<typeof EditorWithProposals> = {
  title: 'Workflows Management/Proposed Changes',
  component: EditorWithProposals,
  decorators: [kibanaReactDecorator, StoryProviders],
};

export default meta;

type Story = StoryObj<typeof EditorWithProposals>;

export const InsertAndReplace: Story = {
  args: {
    proposals: [INSERT_PROPOSAL, REPLACE_PROPOSAL],
    onStepRun: () => {},
  },
};

export const InsertOnly: Story = {
  args: {
    proposals: [INSERT_PROPOSAL],
    onStepRun: () => {},
  },
};

export const ReplaceOnly: Story = {
  args: {
    proposals: [REPLACE_PROPOSAL],
    onStepRun: () => {},
  },
};

export const DeleteLines: Story = {
  args: {
    proposals: [DELETE_PROPOSAL],
    onStepRun: () => {},
  },
};

export const AllTypes: Story = {
  args: {
    proposals: [INSERT_PROPOSAL, REPLACE_PROPOSAL, DELETE_PROPOSAL],
    onStepRun: () => {},
  },
};
