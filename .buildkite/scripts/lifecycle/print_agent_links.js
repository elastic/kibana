const NOW = new Date();
const TWO_HOURS = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);

const METRICS_URL = [
  `https://kibana-ops-buildkite-monitoring.kb.us-central1.gcp.cloud.es.io:9243`,
  `/app/metrics/link-to/host-detail/${process.env.BUILDKITE_AGENT_NAME}`,
  `?to=${TWO_HOURS.getTime()}`,
  `&from=${NOW.getTime()}`,
].join('');

const LOGS_URL = [
  `https://kibana-ops-buildkite-monitoring.kb.us-central1.gcp.cloud.es.io:9243`,
  `/app/logs/link-to/host-logs/${process.env.BUILDKITE_AGENT_NAME}`,
  `?time=${NOW.getTime()}`,
].join('');

console.log('--- Agent Debug Links');
console.log('Agent Metrics:');
console.log('\u001b]1339;' + `url='${METRICS_URL}'\u0007`);
console.log('Agent Logs:');
console.log('\u001b]1339;' + `url='${LOGS_URL}'\u0007`);
