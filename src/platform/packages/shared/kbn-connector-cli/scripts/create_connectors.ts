/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createConnectors } from '../src/create_connectors/create_connectors';

run(
  ({ log, flags }) => {
    return createConnectors({ log, dryRun: Boolean(flags['dry-run']) }).then(() => undefined);
  },
  {
    description: 'Creates a fleet of testing connectors in a running Kibana instance',
    flags: {
      boolean: ['dry-run'],
      help: `
        --dry-run    Show what would be created without making API calls (secrets are redacted)
      `,
    },
  }
);
