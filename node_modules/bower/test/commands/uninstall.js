var path = require('path');
var expect = require('expect.js');
var fs = require('fs');

var helpers = require('../helpers');
var bower = helpers.require('lib/index');

describe('bower uninstall', function () {

    var tempDir = new helpers.TempDir({
        'bower.json': {
            name: 'hello-world',
            dependencies: {
                'underscore': '*'
            }
        }
    });

    beforeEach(function() {
        tempDir.prepare();
    });

    var bowerJsonPath = path.join(tempDir.path, 'bower.json');

    function bowerJson() {
        return JSON.parse(fs.readFileSync(bowerJsonPath));
    }

    var config = {
        cwd: tempDir.path,
        interactive: true
    };

    it('does not remove anything from dependencies by default', function () {
        var logger = bower.commands.uninstall(['underscore'], undefined, config);

        return helpers.expectEvent(logger, 'end')
        .then(function () {
            expect(bowerJson().dependencies).to.eql({ 'underscore': '*' });
        });
    });

    it('removes dependency from bower.json if --save flag is used', function () {
        var logger = bower.commands.uninstall(['underscore'], {save: true}, config);

        return helpers.expectEvent(logger, 'end')
        .then(function () {
            expect(bowerJson().dependencies).to.eql({});
        });
    });

});
