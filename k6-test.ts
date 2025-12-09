import http from 'k6/http';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';

// 1. Configuration: Define the load profile
export const options = {
  stages: [{ duration: '60s', target: 10 }],
  // Thresholds: Fail the test if these criteria aren't met
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
  },
};

// 2. The Test Logic (The "Virtual User" loop)
export default function () {
  const url =
    'https://nikita-indik-load-testing-5ab344.kb.eastus2.azure.qa.cld.elstc.co/internal/detection_engine/prebuilt_rules/installation/_review';

  const headers = {
    Authorization: `Basic ${encoding.b64encode('test:EkeMJM1H8YiXyBZOkOE3MOD5')}`,
    'content-type': 'application/json',
    'elastic-api-version': '1',
    'kbn-build-number': '92366',
    'kbn-version': '9.2.2',
    'x-elastic-internal-origin': 'Kibana',
  };

  const res = http.post(url, null, { headers });

  // 3. Validation: Did the API return what we expected?
  check(res, {
    'is status 200': (r) => r.status === 200,
    // 'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // 4. Think Time: Wait 1s between requests (simulates a real user)
  sleep(1);
}
