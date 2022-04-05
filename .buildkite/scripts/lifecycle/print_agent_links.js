/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line import/no-unresolved
const { BuildkiteClient } = require('kibana-buildkite-library');

(async () => {
  try {
    const client = new BuildkiteClient();
    const build = await client.getCurrentBuild();

    const job = build.jobs.find((j) => j.id === process.env.BUILDKITE_JOB_ID);
    const startTime = job ? new Date(job.started_at) : new Date().getTime() - 60 * 60 * 1000;
    const twoHours = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const METRICS_URL = [
      `https://kibana-ops-buildkite-monitoring.kb.us-central1.gcp.cloud.es.io:9243`,
      `/app/metrics/link-to/host-detail/${process.env.BUILDKITE_AGENT_NAME}`,
      `?to=${twoHours.getTime()}`,
      `&from=${startTime.getTime()}`,
    ].join('');

    const LOGS_URL = [
      `https://kibana-ops-buildkite-monitoring.kb.us-central1.gcp.cloud.es.io:9243`,
      `/app/logs/link-to/host-logs/${process.env.BUILDKITE_AGENT_NAME}`,
      `?time=${startTime.getTime()}`,
    ].join('');

    console.log('Agent Metrics:');
    console.log('\u001b]1339;' + `url='${METRICS_URL}'\u0007`);
    console.log('Agent Logs:');
    console.log('\u001b]1339;' + `url='${LOGS_URL}'\u0007`);
  } catch (ex) {
    // Probably don't need to fail the build for this failure, just log it
    console.error('Buildkite API Error', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
  }
})();
