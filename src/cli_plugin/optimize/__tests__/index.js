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
        expect(program.command.calledWith('optimize')).to.be(true);

        program.command.restore();
      });

      it('should define the description', function () {
        sinon.spy(program, 'description');

        index(program);
        expect(program.description.calledWith('force the optimization for all plugins')).to.be(true);

        program.description.restore();
      });


    });

  });

});
