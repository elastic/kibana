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

const SAMPLE_YAML_WITH_INSERT = `${SAMPLE_YAML.trimEnd()}
  - name: notify_slack
    type: slack
    connector-id: my-slack
    with:
      message: "Found {{ steps.fetch_issues.output.total_count }} open PRs for One Workflow"
`;

const SAMPLE_YAML_WITH_REPLACE = SAMPLE_YAML.replace(
  '  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"',
  '  github_api_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=50"'
);

const SAMPLE_YAML_WITH_DELETE = SAMPLE_YAML.replace(
  '  # slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"\n',
  ''
);

const SAMPLE_YAML_ALL_CHANGES = SAMPLE_YAML_WITH_INSERT.replace(
  '  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"',
  '  github_api_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=50"'
).replace('  # slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"\n', '');

const PR_REPORT_YAML = `version: '1'
name: Open PRs Report for Team One Workflow
description: Fetches open PRs labeled "Team:One Workflow" from elastic/kibana via the GitHub API daily at 9:00 AM (Europe/Madrid), groups them by author, and posts a formatted summary to Slack.

enabled: true
tags:
  - github
  - slack
  - team-one-workflow

inputs:
  properties:
    label:
      type: string
      description: "GitHub label to filter PRs by"
      default: "Team:One Workflow"
  required:
    - label
  additionalProperties: false

consts:
  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22{{ inputs.label | url_encode }}%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"

triggers:
  - type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        byhour:
          - 9
        byminute:
          - 0
        tzid: Europe/Madrid

steps:
  - name: get_prs_from_github
    type: http
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: application/vnd.github+json

  - name: build_pr_list
    type: data.map
    items: "\${{ steps.get_prs_from_github.output.data.items }}"
    with:
      fields:
        title: \${{ item.title }}
        url: \${{ item.html_url }}
        author: \${{ item.user.login }}
        created_at: \${{ item.created_at }}
        number: \${{ item.number }}
        time_ago: '{% assign now_epoch = "now" | date: "%s" | plus: 0 %}{% assign created_epoch = item.created_at | date: "%s" | plus: 0 %}{% assign diff_seconds = now_epoch | minus: created_epoch %}{% assign diff_minutes = diff_seconds | divided_by: 60 %}{% assign diff_hours = diff_minutes | divided_by: 60 %}{% assign diff_days = diff_hours | divided_by: 24 %}{% if diff_days > 0 %}{{ diff_days }} days ago{% elsif diff_hours > 0 %}{{ diff_hours }} hours ago{% else %}{{ diff_minutes }} minutes ago{% endif %}'

  - name: format_slack_message
    type: data.set
    with:
      pr_count: "{{ steps.get_prs_from_github.output.data.total_count }}"
      message: |-
        :github: *Open PRs for {{ inputs.label }}* ({{ steps.get_prs_from_github.output.data.total_count }} total)

        {% assign grouped = steps.build_pr_list.output | group_by: "author" %}{% for group in grouped %}*{{ group.name }}:*
        {% for pr in group.items %}\u2022 <{{ pr.url }}|#{{ pr.number }} \u2014 {{ pr.title }}> \u2014 opened {{ pr.time_ago }}
        {% endfor %}
        {% endfor %}

  - name: send_slack_message
    type: slack
    connector-id: 0ee5d857-3653-4ee2-930f-638cf2a1d990
    with:
      message: "{{ steps.format_slack_message.output.message }}"
`;

const PR_REPORT_AFTER_YAML = `version: '1'
name: Open PRs Report for Team One Workflow
description: Fetches open PRs labeled "Team:One Workflow" from elastic/kibana via the GitHub API on manual trigger, groups them by author, and posts a formatted summary to Slack.

enabled: true
tags:
  - github
  - slack
  - team-one-workflow

inputs:
  properties:
    label:
      type: string
      description: GitHub label to filter PRs by
      default: Team:One Workflow
    repo:
      type: string
      description: GitHub repository in owner/repo format
      default: elastic/kibana
  required:
    - label
    - repo
  additionalProperties: false

consts:
  github_search_url: https://api.github.com/search/issues?q=is%3Apr+label%3A%22{{ inputs.label | url_encode }}%22+is%3Aopen+repo%3A{{ inputs.repo | url_encode }}&per_page=100

triggers:
  # - type: scheduled
  #   with:
  #     rrule:
  #       freq: DAILY
  #       interval: 1
  #       byhour:
  #         - 9
  #       byminute:
  #         - 0
  #       tzid: Europe/Madrid
  - type: manual
steps:
  - name: get_prs_from_github
    type: http
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: application/vnd.github+json

  - name: build_pr_list
    type: data.map
    items: "\${{ steps.get_prs_from_github.output.data.items }}"
    with:
      fields:
        title: \${{ item.title }}
        url: \${{ item.html_url }}
        author: \${{ item.user.login }}
        created_at: \${{ item.created_at }}
        number: \${{ item.number }}
        time_ago: '{% assign now_epoch = "now" | date: "%s" | plus: 0 %}{% assign created_epoch = item.created_at | date: "%s" | plus: 0 %}{% assign diff_seconds = now_epoch | minus: created_epoch %}{% assign diff_minutes = diff_seconds | divided_by: 60 %}{% assign diff_hours = diff_minutes | divided_by: 60 %}{% assign diff_days = diff_hours | divided_by: 24 %}{% if diff_days > 0 %}{{ diff_days }} days ago{% elsif diff_hours > 0 %}{{ diff_hours }} hours ago{% else %}{{ diff_minutes }} minutes ago{% endif %}'

  - name: format_slack_message
    type: data.set
    with:
      pr_count: "{{ steps.get_prs_from_github.output.data.total_count }}"
      message: |-
        :github: *Open PRs for {{ inputs.label }}* ({{ steps.get_prs_from_github.output.data.total_count }} total)

        {% assign grouped = steps.build_pr_list.output | group_by: "author" %}{% for group in grouped %}*{{ group.name }}:*
        {% for pr in group.items %}\u2022 <{{ pr.url }}|#{{ pr.number }} \u2014 {{ pr.title }}> \u2014 opened {{ pr.time_ago }}
        {% endfor %}
        {% endfor %}

  - name: send_slack_message
    type: slack
    connector-id: 0ee5d857-3653-4ee2-930f-638cf2a1d990
    with:
      message: "{{ steps.format_slack_message.output.message }}"
`;

const LARGE_YAML = `version: 1
name: 'Space Missions Demo'
description:
  Demonstrates all 9 Elasticsearch step types through a space mission tracker:
  index lifecycle, bulk loading, search, ES|QL analytics, document CRUD,
  and generic API requests.
enabled: false
tags: []

consts:
  indexName: space-missions-demo

triggers:
  - type: manual

steps:
  # 1. elasticsearch.index.create - Create the demo index with mappings
  - name: create_index
    type: elasticsearch.index.create
    with:
      index: '{{ consts.indexName }}'
      body:
        settings:
          number_of_shards: 1
          number_of_replicas: 0
        mappings:
          properties:
            mission_name:
              type: keyword
            agency:
              type: keyword
            launch_date:
              type: date
            status:
              type: keyword
            crew_size:
              type: integer
            destination:
              type: keyword
            budget_millions:
              type: float
            description:
              type: text

  - name: log_index_created
    type: console
    with:
      message: '✅ Index created: {{ consts.indexName }}'

  # 2. elasticsearch.bulk - Load sample mission data
  - name: load_missions
    type: elasticsearch.bulk
    with:
      body:
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: Apollo 11
          agency: NASA
          launch_date: '1969-07-16'
          status: completed
          crew_size: 3
          destination: Moon
          budget_millions: 355
          description: First crewed mission to land on the Moon
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: Voyager 1
          agency: NASA
          launch_date: '1977-09-05'
          status: active
          crew_size: 0
          destination: Interstellar
          budget_millions: 865
          description: Farthest human-made object from Earth
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: Mars Rover Curiosity
          agency: NASA
          launch_date: '2011-11-26'
          status: active
          crew_size: 0
          destination: Mars
          budget_millions: 2500
          description: Car-sized rover exploring Gale Crater on Mars
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: ISS Assembly
          agency: Multi-agency
          launch_date: '1998-11-20'
          status: active
          crew_size: 6
          destination: LEO
          budget_millions: 150000
          description: International Space Station assembly and operations
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: Artemis I
          agency: NASA
          launch_date: '2022-11-16'
          status: completed
          crew_size: 0
          destination: Moon
          budget_millions: 4100
          description: Uncrewed test flight around the Moon
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: James Webb Telescope
          agency: NASA/ESA/CSA
          launch_date: '2021-12-25'
          status: active
          crew_size: 0
          destination: L2
          budget_millions: 10000
          description: Space telescope at the second Lagrange point
        - index:
            _index: '{{ consts.indexName }}'
        - mission_name: Starship Test Flight
          agency: SpaceX
          launch_date: '2023-04-20'
          status: completed
          crew_size: 0
          destination: Suborbital
          budget_millions: 2000
          description: Full stack Starship test flight

  - name: log_data_loaded
    type: console
    with:
      message: '📦 Data loaded: {{ steps.load_missions.output.items | size }} missions indexed'

  # 3. elasticsearch.search - Search for active NASA missions
  - name: search_active_nasa
    type: elasticsearch.search
    with:
      index: '{{ consts.indexName }}'
      body:
        query:
          bool:
            must:
              - term:
                  status: active
              - term:
                  agency: NASA
        sort:
          - launch_date:
              order: desc

  - name: log_search_results
    type: console
    with:
      message: '🔍 Found {{ steps.search_active_nasa.output.hits.total.value }} active NASA missions'

  # 4. elasticsearch.esql - Run an ES|QL analytics query
  - name: analytics_query
    type: elasticsearch.esql
    with:
      query: >
        FROM space-missions-demo
        | STATS mission_count = COUNT(*), avg_budget = AVG(budget_millions),
                total_budget = SUM(budget_millions)
          BY agency
        | SORT mission_count DESC

  - name: log_analytics
    type: console
    with:
      message: '📊 Analytics complete: {{ steps.analytics_query.output.values | size }} agencies analyzed'

  # 5. elasticsearch.document.index - Add a new mission
  - name: add_mission
    type: elasticsearch.document.index
    with:
      index: '{{ consts.indexName }}'
      body:
        mission_name: Europa Clipper
        agency: NASA
        launch_date: '2024-10-14'
        status: active
        crew_size: 0
        destination: Jupiter/Europa
        budget_millions: 5000
        description: Mission to study Jupiters moon Europa

  - name: log_new_mission
    type: console
    with:
      message: '🆕 New mission indexed: {{ steps.add_mission.output._id }}'

  # 6. elasticsearch.document.get - Retrieve the new mission
  - name: get_mission
    type: elasticsearch.document.get
    with:
      index: '{{ consts.indexName }}'
      id: '{{ steps.add_mission.output._id }}'

  - name: log_retrieved
    type: console
    with:
      message: '📄 Retrieved: {{ steps.get_mission.output._source.mission_name }} ({{ steps.get_mission.output._source.destination }})'

  # 7. elasticsearch.document.update - Update mission status
  - name: update_mission
    type: elasticsearch.document.update
    with:
      index: '{{ consts.indexName }}'
      id: '{{ steps.add_mission.output._id }}'
      body:
        doc:
          status: in_progress
          crew_size: 0

  - name: log_updated
    type: console
    with:
      message: '✏️ Updated mission status to: in_progress'

  # 8. elasticsearch.document.delete - Clean up the added mission
  - name: delete_mission
    type: elasticsearch.document.delete
    with:
      index: '{{ consts.indexName }}'
      id: '{{ steps.add_mission.output._id }}'

  - name: log_deleted
    type: console
    with:
      message: '🗑️ Deleted mission: {{ steps.add_mission.output._id }}'

  # 9. elasticsearch.request - Generic API call to check cluster health
  - name: cluster_health
    type: elasticsearch.request
    with:
      method: GET
      path: /_cluster/health
      query:
        level: indices
        filter_path: status,indices.space-missions-demo.*

  - name: log_health
    type: console
    with:
      message: '🏥 Cluster health: {{ steps.cluster_health.output.status }}'

  # 10. elasticsearch.search - Final count of all missions
  - name: final_search
    type: elasticsearch.search
    with:
      index: '{{ consts.indexName }}'
      body:
        query:
          match_all: {}
        size: 0

  - name: log_final_count
    type: console
    with:
      message: '🏁 Demo complete! Total missions in index: {{ steps.final_search.output.hits.total.value }}. All 9 Elasticsearch step types demonstrated successfully!'

  # 14. elasticsearch.index.delete - Clean up the demo index
  - name: cleanup_index
    type: elasticsearch.index.delete
    with:
      index: '{{ consts.indexName }}'

  - name: log_cleanup
    type: console
    with:
      message: '✅ Cleaned up — deleted {{ consts.indexName }} index. Demo finished!'
`;

const CLEANED_UP_YAML = `version: 1
name: 'Space Missions Demo'
description: Demonstrates all 9 Elasticsearch step types through a space mission tracker.
enabled: false
tags: []

consts:
  indexName: space-missions-demo

triggers:
  - type: manual

steps:
  - name: create_index
    type: elasticsearch.index.create
    with:
      index: '{{ consts.indexName }}'
      body:
        settings:
          number_of_shards: 1
          number_of_replicas: 0
        mappings:
          properties:
            mission_name: { type: keyword }
            agency: { type: keyword }
            launch_date: { type: date }
            status: { type: keyword }
            crew_size: { type: integer }
            destination: { type: keyword }
            budget_millions: { type: float }
            description: { type: text }

  - name: load_missions
    type: elasticsearch.bulk
    with:
      body:
        - index: { _index: '{{ consts.indexName }}' }
        - mission_name: Apollo 11
          agency: NASA
          launch_date: '1969-07-16'
          status: completed
          crew_size: 3
          destination: Moon
          budget_millions: 355
          description: First crewed mission to land on the Moon
        - index: { _index: '{{ consts.indexName }}' }
        - mission_name: Voyager 1
          agency: NASA
          launch_date: '1977-09-05'
          status: active
          crew_size: 0
          destination: Interstellar
          budget_millions: 865
          description: Farthest human-made object from Earth
        - index: { _index: '{{ consts.indexName }}' }
        - mission_name: Artemis I
          agency: NASA
          launch_date: '2022-11-16'
          status: completed
          crew_size: 0
          destination: Moon
          budget_millions: 4100
          description: Uncrewed test flight around the Moon

  - name: log_loaded
    type: console
    with:
      message: 'Loaded {{ steps.load_missions.output.items | size }} missions'

  - name: search_active_nasa
    type: elasticsearch.search
    with:
      index: '{{ consts.indexName }}'
      body:
        query:
          bool:
            must:
              - term: { status: active }
              - term: { agency: NASA }

  - name: log_search
    type: console
    with:
      message: 'Found {{ steps.search_active_nasa.output.hits.total.value }} active NASA missions'

  - name: analytics_query
    type: elasticsearch.esql
    with:
      query: >
        FROM space-missions-demo
        | STATS count = COUNT(*), avg_budget = AVG(budget_millions) BY agency
        | SORT count DESC

  - name: log_analytics
    type: console
    with:
      message: 'Analytics: {{ steps.analytics_query.output.values | size }} agencies'

  - name: add_mission
    type: elasticsearch.document.index
    with:
      index: '{{ consts.indexName }}'
      body:
        mission_name: Europa Clipper
        agency: NASA
        launch_date: '2024-10-14'
        status: active
        crew_size: 0
        destination: Jupiter/Europa
        budget_millions: 5000
        description: Mission to study Jupiters moon Europa

  - name: get_mission
    type: elasticsearch.document.get
    with:
      index: '{{ consts.indexName }}'
      id: '{{ steps.add_mission.output._id }}'

  - name: update_mission
    type: elasticsearch.document.update
    with:
      index: '{{ consts.indexName }}'
      id: '{{ steps.add_mission.output._id }}'
      body:
        doc:
          status: in_progress

  - name: delete_mission
    type: elasticsearch.document.delete
    with:
      index: '{{ consts.indexName }}'
      id: '{{ steps.add_mission.output._id }}'

  - name: cluster_health
    type: elasticsearch.request
    with:
      method: GET
      path: /_cluster/health

  - name: final_search
    type: elasticsearch.search
    with:
      index: '{{ consts.indexName }}'
      body:
        query: { match_all: {} }
        size: 0

  - name: log_final
    type: console
    with:
      message: 'Total missions: {{ steps.final_search.output.hits.total.value }}'

  - name: cleanup_index
    type: elasticsearch.index.delete
    with:
      index: '{{ consts.indexName }}'

  - name: log_cleanup
    type: console
    with:
      message: 'Cleaned up {{ consts.indexName }} index. Demo finished.'
`;

interface EditorWithProposalsProps {
  yaml?: string;
  afterYaml?: string;
  onStepRun: (params: { stepId: string; actionType: string }) => void;
}

const EditorWithProposals: React.FC<EditorWithProposalsProps> = ({
  yaml = SAMPLE_YAML,
  afterYaml,
  onStepRun,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const managerRef = useRef<ProposalManager | null>(null);
  const proposalsApplied = useRef(false);

  useEffect(() => {
    dispatch(setYamlString(yaml));
    dispatch(setActiveTab('workflow'));
  }, [dispatch, yaml]);

  useEffect(() => {
    if (proposalsApplied.current || !afterYaml) return;

    const interval = setInterval(() => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model) return;

      clearInterval(interval);
      proposalsApplied.current = true;

      const manager = new ProposalManager();
      manager.initialize(editor);
      managerRef.current = manager;

      manager.applyAfterYaml(afterYaml);
    }, 100);

    return () => {
      clearInterval(interval);
      managerRef.current?.dispose();
      managerRef.current = null;
      proposalsApplied.current = false;
    };
  }, [afterYaml]);

  return <WorkflowYAMLEditor editorRef={editorRef} onStepRun={onStepRun} />;
};

const StoryProviders: Decorator = (story: () => React.ReactElement, _context: StoryContext) => (
  <QueryClientProvider client={storyQueryClient}>
    <MemoryRouter>
      <WorkflowDetailStoreProvider>
        <div css={{ height: '98vh', display: 'flex', flexDirection: 'column' }}>{story()}</div>
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
    afterYaml: SAMPLE_YAML_WITH_INSERT.replace(
      '  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"',
      '  github_api_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=50"'
    ),
    onStepRun: () => {},
  },
};

export const InsertOnly: Story = {
  args: {
    afterYaml: SAMPLE_YAML_WITH_INSERT,
    onStepRun: () => {},
  },
};

export const ReplaceOnly: Story = {
  args: {
    afterYaml: SAMPLE_YAML_WITH_REPLACE,
    onStepRun: () => {},
  },
};

export const DeleteLines: Story = {
  args: {
    afterYaml: SAMPLE_YAML_WITH_DELETE,
    onStepRun: () => {},
  },
};

export const AllTypes: Story = {
  args: {
    afterYaml: SAMPLE_YAML_ALL_CHANGES,
    onStepRun: () => {},
  },
};

export const LargeReplace: Story = {
  args: {
    yaml: LARGE_YAML,
    afterYaml: CLEANED_UP_YAML,
    onStepRun: () => {},
  },
};

export const MultipleProposals: Story = {
  args: {
    yaml: PR_REPORT_YAML,
    afterYaml: PR_REPORT_AFTER_YAML,
    onStepRun: () => {},
  },
};
