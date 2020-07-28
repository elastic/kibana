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

import _ from 'lodash';
import Boom from 'boom';
import Bluebird from 'bluebird';
import { unlinkSync as unlink } from 'fs';
const writeFile = Bluebird.promisify(require('fs').writeFile);

export default Bluebird.method(function (kbnServer, server, config) {
  const path = config.get('pid.file');
  if (!path) return;

  const pid = String(process.pid);

  return writeFile(path, pid, { flag: 'wx' })
    .catch(function (err) {
      if (err.code !== 'EEXIST') throw err;

      const message = `pid file already exists at ${path}`;
      const metadata = {
        path: path,
        pid: pid,
      };

      if (config.get('pid.exclusive')) {
        throw Boom.internal(message, { message, ...metadata });
      } else {
        server.log(['pid', 'warning'], message, metadata);
      }

      return writeFile(path, pid);
    })
    .then(function () {
      server.logWithMetadata(['pid', 'debug'], `wrote pid file to ${path}`, {
        path: path,
        pid: pid,
      });

      const clean = _.once(function () {
        unlink(path);
      });

      process.once('exit', clean); // for "natural" exits
      process.once('SIGINT', function () {
        // for Ctrl-C exits
        clean();

        // resend SIGINT
        process.kill(process.pid, 'SIGINT');
      });

      process.on('unhandledRejection', function (reason) {
        server.log(['warning'], `Detected an unhandled Promise rejection.\n${reason}`);
      });
    });
});
