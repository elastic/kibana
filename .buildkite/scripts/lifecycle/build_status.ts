/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BuildkiteClient } from '#pipeline-utils';

(async () => {
  try {
    const client = new BuildkiteClient();
    const status = await client.getCurrentBuildStatus();
    console.log(status.success ? 'true' : 'false');
    process.exit(0);
  } catch (ex) {
    console.error('Buildkite API Error', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
