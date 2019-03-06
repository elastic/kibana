/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Octokit from '@octokit/rest';
import { markdownMetadata } from './metadata';

export { markdownMetadata };

export function getGithubClient() {
  const client = new Octokit();
  client.authenticate({
    //auth: process.env.GITHUB_TOKEN
    auth: {
      clientId: '25454',
      clientSecret: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAw+5PPK7gdH8MSqeZpunMAju4K/MfNTo6Z+yVtcEZJumg9cZd\nD+mCOnCwEZbaFznjdntBHQcTXLYWfYqB+Eve27EtwSvNMDtcGRn0zZ1bTtjn0Xz0\nSk594R1xF7RfQwMRvESgNALs8XjsQp87Xmy0RV5iSK4BDChCxjFLf2rzt85j9KyV\nvHo6FxUaKpVw+JArMCuFn6T3vm397mKbPRRnHcl126dWf8o/PwOsYC53Vq4YLAnD\nXIFBmBhkyUaEQN2dpfjpgJA8uTW73k3qnGbGWzU21ELJ4YoIEXIhU9DEjAfqRYmS\nwCiAZxaCvMt6OBGLceO4Re+WNBEl9C9neDN1TwIDAQABAoIBAA3WAlpyrv8LCb8r\n3rnewL1XokXYQVfs6Lr2Bgxzumb5EJjKjT/WaY/e7VAQqw4A1INFaO+31DIz2Zq7\n8Tmrge1ZsbV2dmL1jidnodXzSsNipdwxSr8Ek/cVsSrPXfrJeLMm1XlWy4yx0V1T\nCUo9uu07IQ2o3AITxcNhL8ersdJE7P0Q3/T1MpJMw0ttaxDK5N74DupO+Kgrhh17\nC2pBp070gyiSt2c2kgxqyZKBsb1hYlpx3V6aSgEafuhXuKuYmhBjHuYunGAwG7Vu\nLVZuhy63xCrxK8Vc8Y6i1JpsRiZ14JyBnOVOIShBDUoT+OPpmIH4/JVGHE8VH+s8\nmskZUKECgYEA/srthFkvSRFlMkJoiG8NGNe/aGAtM0J6W5XEsbL8rQJMqOL6jIZL\n8rV2/A+m4/eZA1YBl3bEXyVlsgsTEbq5cMcPF4RMzPGBkwW4T/ysDMjhgcb5U0h2\nEr00psau3L710c6JCa8OEboyw5FkCh8vnilNriGnIL6s//IIOVGTIoUCgYEAxNv6\n+Ss/54knTJIQq5FeeK/E9RGP8ToBcn9+qi/CO7uw5syKRf7qbR5pnorDFNxdcuG/\nKlKeGHgzsXrKvAVL6RwjKqOs1kpxWBxoUD8LnhDyaeTxeOREeXIWzMqYP7ZHeJT4\nfhBFqdd4khSLVuE1UcKj1nZxhqanPv2y5+qoosMCgYALhfoABliRIWxGPaKkqQEa\noodRnSfuLY+DHN7sen/bA0OcT8etG1XMAFEFTV/q54PQFs+znfd7piFXUBDouF0y\nsI4KLj2a90E4+QVA+Nh/K4ana+xSy/ArIMuEz2+RJEHR31lrSrOEMbuiBK1Vl9t7\nd7q/qV35qSYB3Vxp2zqgUQKBgH/H+sS6GiUElgnR1hhHp/bWwRYCbFi8uivELkfx\n8DYtwspNgoOk0C48S3qpv69OyynC9v9V2WEwxP0zI12gYoHRzdHjpFEEyUXUSrGr\n+rKDdZbfEQ7TvM7IC5yq9OCGRSY0LIhHr7BrOMw5oainTqDfotGW2GH60xzEONjp\nLMVZAoGBAIKaBkrtKuMkxNE+tM5G59rvkp+y+blj/99weYgBZRMZOE/sWTc70yvQ\n2Wm2c8wt1LmcwqUz61uILRlupiDGS35CpCk3wY03D/GUNIDcvrHk/YsfXoAkBTZ5\n8WvmKWwHrL2jxIUk+QHFkkgzeRib3oGzqtDMxcMMCDLvrGBlFhos\n-----END RSA PRIVATE KEY-----\n' // eslint-disable-line
    }
  });

  return client;
}

export async function paginate(client, promise) {
  let response = await promise;
  let { data } = response;
  while (client.hasNextPage(response)) {
    response = await client.getNextPage(response);
    data = data.concat(response.data);
  }
  return data;
}
