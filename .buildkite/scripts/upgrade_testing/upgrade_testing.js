/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const createInstance = require('./create_instance');
const setUpInstance = require('./set_up_instance');
const upgradeInstance = require('./upgrade_instance');
const runInstanceTests = require('./run_instance_tests');
const deleteInstance = require('./delete_instance');

(async () => {
  const { resources, deploymentId, credentials } = await createInstance('7.15.0');

  const baseCommand = await setUpInstance(deploymentId, credentials, resources);
  await upgradeInstance(deploymentId, '7.16.0');

  await runInstanceTests(baseCommand, deploymentId);

  await deleteInstance(deploymentId);
})();
