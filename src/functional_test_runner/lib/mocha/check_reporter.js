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

import Mocha from 'mocha';
import { relative } from 'path';
import { format } from 'util';
const fs = require('fs');
const stripAnsi = require('strip-ansi');
const path = require('path');

export class MochaCheckReporter extends Mocha.reporters.Base {
  constructor(runner, options) {
    super(runner, options);
    console.log(JSON.stringify(options));
    runner.on('fail', this.onFail);
    runner.on('end', this.onEnd);
  }

    errors = [];
    pathToRoot = '/../../../..';

    onFail = (runnable, err) => {
      const path = relative(__dirname + this.pathToRoot, runnable.file);
      const title = getTitle(runnable);
      const [, line] = runnable._trace.stack
        .split('\n')
        .filter(item => item.indexOf(path) > -1)[0]
        .slice(0, -1)
        .split(':');

      function getTitle(runnable, title = []) {
        if(runnable.title) {
          title.push(runnable.title);
          return getTitle(runnable.parent, title);
        } else {
          return title.join(' / ');
        }
      }

      let output = '';
      const realLog = console.log;
      console.log = (...args) => output += `${format(...args)}\n`;
      try {
        Mocha.reporters.Base.list([runnable]);
      } finally {
        console.log = realLog;
      }

      this.errors.push({
        // ...runnable.addl,
        path,
        start_line: line,
        end_line: line,
        annotation_level: 'failure',
        title,
        //message: stripAnsi(output).split('\n')[2].trim(),
        message: JSON.stringify(runnable.addl)
      });
    }

    onEnd = () => {
      fs.writeFileSync(__dirname + this.pathToRoot + '/target/errors.json', JSON.stringify(this.errors, undefined, 2));
      console.log('onEnd', JSON.stringify(this.errors, undefined, 2));
      console.log(path.resolve(__dirname, this.pathToRoot, '/target/errors.json'));
    }
}

