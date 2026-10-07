/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadKibanaModule } from '../../pipeline-utils/load_kibana_module.ts';

interface AffectedPackagesModule {
  main: () => Promise<void>;
}

const { main } = loadKibanaModule<AffectedPackagesModule>(
  './src/platform/kbn-ui/_tooling/affected_packages'
);

main().catch((error) => {
  process.stderr.write(`${(error as Error).stack ?? error}\n`);
  process.exit(1);
});
