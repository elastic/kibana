/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSkill } from '../../../connector_spec';
import { buildGithubResources } from './github_resources';

export const githubSkillFile = buildSkill(({ bt, fence }) => ({
  id: 'connector-github',
  name: 'connector-github',
  description:
    'Search and list GitHub issues and pull requests with compact, context-friendly results (no bodies, avatars, or URL clutter).',
  content: `
**Connector:** Infer the connector from context. If none available, query based on type. Substitute
the chosen ID for ${bt}<connectorId>${bt} in all commands.

In all attached files, running means to execute an action on the connector.  The params table represents
the set of all possible options, adjust as needed to fit the user's intent.

| Intent | Resource |
|---|---|
| Search or find issues and pull requests | ${bt}./resources/issues-pull-requests.md${bt} |
| Browse one repository's issues or pull requests | ${bt}./resources/list-issues-pull-requests.md${bt} |
`.trim(),
  resources: buildGithubResources({ bt, fence }),
}));
