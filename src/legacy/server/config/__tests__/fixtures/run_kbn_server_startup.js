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

import { createRoot } from '../../../../../test_utils/kbn_server';

(async function run() {
  const root = createRoot(JSON.parse(process.env.CREATE_SERVER_OPTS));

  // We just need the server to run through startup so that it will
  // log the deprecation messages. Once it has started up we close it
  // to allow the process to exit naturally
  try {
    await root.setup();
    await root.start();
  } finally {
    await root.shutdown();
  }

}());
