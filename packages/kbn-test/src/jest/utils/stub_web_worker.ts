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

function stubWebWorker() {
  if (!window.Worker) {
    // @ts-ignore we aren't honoring the real Worker spec here
    window.Worker = function Worker() {
      this.postMessage = jest.fn();

      // @ts-ignore TypeScript doesn't think this exists on the Worker interface
      // https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
      this.terminate = jest.fn();
    };
  }
}

stubWebWorker();

// Add an export to avoid TS complaining "stub_web_worker.ts" is not a module.
export { stubWebWorker };
