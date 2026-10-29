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
    'Search and list GitHub issues and pull requests with compact results (no bodies, avatars, or URL clutter).',
  content: `
**Connector:** Infer the connector from context. If none available, query based on type. Use its ID as
${bt}connector_id${bt}.

Each attached file contains workflows. To run one, call ${bt}platform.core.execute_workflow${bt} with the workflow YAML as
${bt}yaml${bt} (it does not need to be saved first) and ${bt}connector_id${bt} plus any inputs from the file's table as ${bt}inputs${bt}.
The inputs table represents all possible options; use only what the user's request needs. Workflows trim the
response to what is useful, so prefer them over calling the connector directly for these lookups.

| Intent | Resource |
|---|---|
| Search or find issues and pull requests | ${bt}./resources/issues-pull-requests.md${bt} |
| Browse one repository's issues or pull requests | ${bt}./resources/list-issues-pull-requests.md${bt} |

For anything else (reading an issue's body or comments, commits, files, or creating and updating issues and
pull requests), use the connector's own guide and actions.
`.trim(),
  resources: buildGithubResources({ bt, fence }),
}));
