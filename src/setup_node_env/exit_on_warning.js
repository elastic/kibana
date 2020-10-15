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

if (process.noProcessWarnings !== true) {
  var ignore = ['MaxListenersExceededWarning'];

  process.on('warning', function (warn) {
    if (ignore.includes(warn.name)) return;

    if (process.traceProcessWarnings === true) {
      console.error('Node.js process-warning detected - Terminating process...');
    } else {
      console.error('Node.js process-warning detected:');
      console.error();
      console.error(warn.stack);
      console.error();
      console.error('Terminating process...');
    }

    process.exit(1);
  });

  // While the above warning listener would also be called on
  // unhandledRejection warnings, we can give a better error message if we
  // handle them separately:
  process.on('unhandledRejection', function (reason) {
    console.error('Unhandled Promise rejection detected:');
    console.error();
    console.error(reason);
    console.error();
    console.error('Terminating process...');
    process.exit(1);
  });
}
