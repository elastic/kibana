/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicJWKS } from '@elastic/request-crypto';

export const telemetryJWKS: PublicJWKS = {
  keys: [
    {
      keys: [
        {
          kty: 'RSA',
          kid: 'kibana_1',
          use: 'enc',
          alg: 'RSA-OAEP',
          e: 'AQAB',
          n:
            'sZWMmiCy9Ysb_ZByG9024bL8a8cDNnXd4BqF4bPm6QwPponFS8cQhvZclz68qiVOa8aZOwB50bz7hVVzBKHP053u4wNN0PbpKD4w2rHS-pgN0m2hRFXwM9clmtEr-9aPTDqfWHsclS5ZZMT9_qyD42VS-zMrTwxBvQU5FNNcogakcaspXRtW3_8J7ZtbwkdvySY7e1DlHHrM7t60bLQ4RQB4q_ocqoeb447Sx1Tf8bJS4m-klregXQ7xQ7gcuuVW1n7tN9N1KDw_GqGm65wkDYDGskTca52STUbKAqX4sird0LI7QTTBX9oKfcNPpMOiD0XJQKGfXuoXQSFIa6vpuQ',
        },
        {
          kty: 'RSA',
          kid: 'kibana_dev_1',
          use: 'enc',
          alg: 'RSA-OAEP',
          e: 'AQAB',
          n:
            'jTbnpqb3vZheLoedLvTJI8Ci7RT-bTkxpmp_ni0PN_b1lv_9c9crbzbIqkE7EiFrqEsFD1xFHOqrFgYdrQmoE3TmDx6hRLGhhKeBWg89opbutb8ET3YSA97Io4uAHk02mo447NWXg7I1HiQau6TkdZNXrol4mjzkiRtUQGDUmhK428sxH3yVZB69WfJijEwtYI81Ms7FynPPAymPzGo_He3-sV0JG5U2OCy8RTohB9Agjq708F8SrVhJ6whX32gQ537DeYOzGUpFXfoIS3HE__OLYeyLj6OoKnyTLl6FF9iMVY8xfAPbFY5eJuMqCzACTsndRuDlYfOsbYFueUQogw',
        },
      ],
    },
  ],
};
