/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';

import { installCommand } from '.';

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

        installCommand(program);
        expect(program.command.calledWith('install <plugin/url>')).toBe(true);

        program.command.restore();
      });

      it('should define the description', function () {
        sinon.spy(program, 'description');

        installCommand(program);
        expect(program.description.calledWith('install a plugin')).toBe(true);

        program.description.restore();
      });

      it('should define the command line options', function () {
        const spy = sinon.spy(program, 'option');

        const options = [/-q/, /-s/, /-c/, /-t/];

        installCommand(program);

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

        installCommand(program);
        expect(program.action.calledOnce).toBe(true);

        program.action.restore();
      });
    });
  });
});
