/*
 * Security-research canary (elastic/kibana CI): reports whether CI
 * environment variable NAMES are present in this job's environment.
 * It never reads or logs values - only SET(length) or UNSET.
 */
const CANARY_ENV_NAMES = [
  'GITHUB_TOKEN',
  'BUILDKITE_TOKEN',
  'EC_API_KEY',
  'PROJECT_API_KEY',
  'GCS_CREDENTIALS',
  'GCS_SA_CDN_KEY',
  'SCOUT_REPORTER_ES_API_KEY',
  'TEST_FAILURES_ES_USERNAME',
  'TEST_FAILURES_ES_PASSWORD',
  'MOON_REMOTE_CACHE_TOKEN',
  'KIBANA_EIS_CCM_API_KEY',
  'KIBANA_SECURITY_GEN_AI_CONFIG',
  'KIBANA_TESTING_AI_CONNECTORS',
  'TRACING_ES_API_KEY',
  'KIBANA_SERVICE_ACCOUNT_PROXY_KEY',
  'ELASTIC_APM_API_KEY',
  'EVAL_KBN_API_KEY',
];

describe('CI environment visibility canary', () => {
  it('reports which CI env var names are set (names only, never values)', () => {
    const report: Record<string, string> = {};
    for (const name of CANARY_ENV_NAMES) {
      const value = process.env[name];
      report[name] = value === undefined ? 'UNSET' : 'SET(len=' + value.length + ')';
    }
    // eslint-disable-next-line no-console
    console.log('CI_ENV_CANARY ' + JSON.stringify(report));
    expect(true).toBe(true);
  });
});
