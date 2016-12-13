import expect from 'expect.js';
import sinon from 'sinon';
import index from '../index';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('commander options', function () {

      const program = {
        command: function () { return program; },
        description: function () { return program; },
        option: function () { return program; },
        action: function () { return program; }
      };

      it('should define the command', function () {
        sinon.spy(program, 'command');

        index(program);
        expect(program.command.calledWith('install <plugin/url>')).to.be(true);

        program.command.restore();
      });

      it('should define the description', function () {
        sinon.spy(program, 'description');

        index(program);
        expect(program.description.calledWith('install a plugin')).to.be(true);

        program.description.restore();
      });

      it('should define the command line options', function () {
        const spy = sinon.spy(program, 'option');

        const options = [
          /-q/,
          /-s/,
          /-c/,
          /-t/,
          /-d/
        ];

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

        expect(options).to.have.length(0);
      });

      it('should call the action function', function () {
        sinon.spy(program, 'action');

        index(program);
        expect(program.action.calledOnce).to.be(true);

        program.action.restore();
      });

    });

  });

});
