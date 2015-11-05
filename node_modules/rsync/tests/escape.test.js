var assert = require('chai').assert;
var Rsync  = require('../rsync');

// Setups to test escaping
var setups = [
  {
    expect: 'rsync -avz --exclude=no-go.txt --exclude="with space" --exclude=.git --exclude=*.tiff path_a/ path_b',
    build: function() {
      return new Rsync()
        .flags('avz')
        .source('path_a/')
        .exclude('no-go.txt')
        .exclude('with space')
        .exclude('.git')
        .exclude('*.tiff')
        .destination('path_b');
    }
  },
  {
    expect: 'rsync -rav -f "- .git" test-dir/ test-dir-copy',
    build: function() {
      return new Rsync()
        .flags('rav')
        .set('f', '- .git')
        .source('test-dir/')
        .destination('test-dir-copy');
    }
  }
];

setups.forEach(function buildTestCase(setup) {
  it ('should build ' + setup.expect, function() {
    var cmd = setup.build();
    assert.strictEqual(cmd.command(), setup.expect,
      'EXPECTED |' + cmd.command() + '| TO EQUAL |' + setup.expect + '|');
  });
});
