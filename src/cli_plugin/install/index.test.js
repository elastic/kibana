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

import sinon from 'sinon';
import index from './index';

describe('kibana cli', function () {
  describe('plugin installer', function () {
    describe('commander options', function () {
      const program = {
        command: function () {
          return program;
        },
        description: function () {
          return program;
        },
        option: function () {
          return program;
        },
        action: function () {
          return program;
        },
      };

      it('should define the command', function () {
        sinon.spy(program, 'command');

        index(program);
        expect(program.command.calledWith('install <plugin/url>')).toBe(true);

        program.command.restore();
      });

      it('should define the description', function () {
        sinon.spy(program, 'description');

        index(program);
        expect(program.description.calledWith('install a plugin')).toBe(true);

        program.description.restore();
      });

      it('should define the command line options', function () {
        const spy = sinon.spy(program, 'option');

        const options = [/-q/, /-s/, /-c/, /-t/, /-d/];

        index(program);

        for (let i = 0; i < spy.callCount; i++) {
          const call = spy.getCall(i);
          for (let o = 0; o < options.length; o++) {
            const option = options[o];
            if (call.args[0].match(option)) {
              options.splice(o, 1);
              break;
            }
          }
        }

        expect(options).toHaveLength(0);
      });

      it('should call the action function', function () {
        sinon.spy(program, 'action');

        index(program);
        expect(program.action.calledOnce).toBe(true);

        program.action.restore();
      });
    });
  });
});
