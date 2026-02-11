/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';
import { createRequire } from 'module';

import { REPO_ROOT } from '@kbn/repo-info';

import type { GenerateCommand } from '../generate_command';

const ACTIONS_REGISTRY_FILE = Path.resolve(
  REPO_ROOT,
  'src/core/packages/user-activity/server/src/user_activity_actions.ts'
);

const SNIPPET_FILE = Path.resolve(
  REPO_ROOT,
  'docs/reference/user-activity/_snippets/user-activity-actions-list.md'
);

interface UserActivityActionDefinition {
  readonly description: string;
  readonly ownerTeam: string;
  readonly groupName: string;
  readonly versionAddedAt: string;
}

interface RemovedUserActivityActionDefinition extends UserActivityActionDefinition {
  readonly versionRemovedAt: string;
}

const normalizeDescription = (description: string) => description.replace(/\s+/g, ' ').trim();

const sortByStringKey =
  <T>(getKey: (value: T) => string) =>
  (a: T, b: T) =>
    getKey(a).localeCompare(getKey(b), 'en');

const formatAppliesTo = ({
  versionAddedAt,
  versionRemovedAt,
}: {
  versionAddedAt: string;
  versionRemovedAt?: string;
}) => {
  if (versionRemovedAt) {
    return `{applies_to}\`stack: ga ${versionAddedAt}-${versionRemovedAt}\``;
  }

  return `{applies_to}\`stack: ga ${versionAddedAt}+\``;
};

async function loadActionRegistries(): Promise<{
  readonly userActivityActions: Record<string, UserActivityActionDefinition>;
  readonly removedUserActivityActions: Record<string, RemovedUserActivityActionDefinition>;
}> {
  const require = createRequire(__filename);
  const registryModule = require(ACTIONS_REGISTRY_FILE) as {
    userActivityActions: Record<string, UserActivityActionDefinition>;
    removedUserActivityActions: Record<string, RemovedUserActivityActionDefinition>;
  };

  return {
    userActivityActions: registryModule.userActivityActions,
    removedUserActivityActions: registryModule.removedUserActivityActions,
  };
}

function renderSnippet({
  userActivityActions,
  removedUserActivityActions,
}: {
  userActivityActions: Record<string, UserActivityActionDefinition>;
  removedUserActivityActions: Record<string, RemovedUserActivityActionDefinition>;
}) {
  type ActionRow =
    | {
        readonly id: string;
        readonly definition: UserActivityActionDefinition;
        readonly isRemoved: false;
      }
    | {
        readonly id: string;
        readonly definition: RemovedUserActivityActionDefinition;
        readonly isRemoved: true;
      };

  const rows: ActionRow[] = [
    ...Object.entries(userActivityActions).map(([id, definition]) => ({
      id,
      definition,
      isRemoved: false as const,
    })),
    ...Object.entries(removedUserActivityActions).map(([id, definition]) => ({
      id,
      definition,
      isRemoved: true as const,
    })),
  ];

  const rowsByGroup = new Map<string, ActionRow[]>();
  for (const row of rows) {
    const group = row.definition.groupName;
    const list = rowsByGroup.get(group) ?? [];
    list.push(row);
    rowsByGroup.set(group, list);
  }

  const groups = [...rowsByGroup.entries()]
    .map(([groupName, groupRows]) => ({
      groupName,
      rows: [...groupRows].sort(sortByStringKey((r) => r.id)),
    }))
    .sort(sortByStringKey((g) => g.groupName));

  const header = `<!--
THIS FILE IS GENERATED. DO NOT EDIT.
To regenerate, run: node scripts/generate user-activity-actions-docs
-->
`;

  const body =
    groups.length === 0
      ? `No user-activity actions are currently registered.\n`
      : groups
          .map((g) => {
            const lines = g.rows.map((row) => {
              const description = normalizeDescription(row.definition.description);
              const { versionAddedAt } = row.definition;

              if (row.isRemoved) {
                const versionRemovedAt = row.definition.versionRemovedAt;
                return `- **${row.id}**: ${description} ${formatAppliesTo({ versionAddedAt, versionRemovedAt })}`;
              }

              return `- **${row.id}**: ${description} ${formatAppliesTo({ versionAddedAt })}`;
            });

            return [`### ${g.groupName}`, '', ...lines].join('\n');
          })
          .join('\n\n') + '\n';

  return header + '\n' + body;
}

export const UserActivityActionsDocsCommand: GenerateCommand = {
  name: 'user-activity-actions-docs',
  description: 'Generate user-activity actions docs snippet (markdown)',
  usage: 'node scripts/generate user-activity-actions-docs',
  async run({ log }) {
    const { userActivityActions, removedUserActivityActions } = await loadActionRegistries();

    const snippet = renderSnippet({ userActivityActions, removedUserActivityActions });

    await Fsp.mkdir(Path.dirname(SNIPPET_FILE), { recursive: true });
    await Fsp.writeFile(SNIPPET_FILE, snippet, 'utf8');

    log.success(`Wrote ${Path.relative(REPO_ROOT, SNIPPET_FILE)}`);
  },
};
