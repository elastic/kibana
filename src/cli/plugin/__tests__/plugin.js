var expect = require('expect.js');
var sinon = require('sinon');

var plugin = require('../plugin');
var installer = require('../pluginInstaller');
var remover = require('../pluginRemover');
var settingParser = require('../settingParser');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('commander options', function () {

      var program = {
        command: function () { return program; },
        description: function () { return program; },
        option: function () { return program; },
        action: function () { return program; }
      };

      it('should define the command', function () {
        sinon.spy(program, 'command');

        plugin(program);
        expect(program.command.calledWith('plugin')).to.be(true);

        program.command.restore();
      });

      it('should define the description', function () {
        sinon.spy(program, 'description');

        plugin(program);
        expect(program.description.calledWith('Maintain Plugins')).to.be(true);

        program.description.restore();
      });

      it('should define the command line options', function () {
        var spy = sinon.spy(program, 'option');

        var options = [
          /-i/,
          /-r/,
          /-s/,
          /-u/,
          /-t/
        ];

        plugin(program);

        for (var i = 0; i < spy.callCount; i++) {
          var call = spy.getCall(i);
          for (var o = 0; o < options.length; o++) {
            var option = options[o];
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

        plugin(program);
        expect(program.action.calledOnce).to.be(true);

        program.action.restore();
      });

    });

  });

});
