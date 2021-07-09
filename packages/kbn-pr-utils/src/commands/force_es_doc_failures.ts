/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Command } from '../cli';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const ForceEsDocFailuresCommand: Command = {
  name: 'force_es_doc_failures',
  description: `
    When the ES Docs check fails to run you can use this task to force a failed state for that commit status, which
    will trigger the prbot to set the status to green if there aren't any doc-specific changes in the PR. Only PRs which
    are not failing for some other reason (failed CI, outdated, etc) and which either have no esDocs status, or one that
    has been pending for over an hour, will get a failed esDocs status set.

    You might need to run this script multiple times during a prolonged outage but that shouldn't be an issue.

    When the script finds PRs with esDocs statuses which started in the last hour it starts to log warnings that should
    indicate that the outage is resolving or resolved because ES Docs jobs are now running again.
  `,
  async run({ log, api }) {
    for await (const pr of api.iterOpenPullRequests()) {
      if (pr.head.overallStatus === 'FAILURE' || pr.head.status.kibanaCi === null) {
        continue;
      }

      if (pr.head.status.esDocs?.state === 'PENDING') {
        const age = Date.now() - pr.head.status.esDocs.createdAt;
        if (age < 1 * HOUR) {
          log.warning(pr.terminalLink, 'ES docs job is running!');
          continue;
        }
      } else if (pr.head.status.esDocs !== null) {
        continue;
      }

      log.info(pr.terminalLink, 'setting commit status to failed');
      await api.setCommitStatus(pr, {
        context: 'elasticsearch-ci/docs',
        state: 'failure',
        description:
          'elasticsearch-ci is experiencing issues triggering docs builds, if your PR does not touch docs files this should turn into a success status',
      });
    }
  },
};
