describe('Finder#get', function () {
  var RcFinder = require('../');
  var join = require('path').join;
  var expect = require('expect.js');

  var fixtures = {
    root: join(__dirname, 'fixtures/foo/foo/foo/foo/'),
    json: join(__dirname, 'fixtures/foo/foo/bar.json'),
    text: join(__dirname, 'fixtures/foo/foo/.baz'),
    config: {
      baz: 'bog'
    }
  };

  it('uses the loader function to get a file', function () {
    var football = {};
    var rcFinder = new RcFinder('bar.json', {
      loader: function (path) {
        return football;
      }
    });
    var config = rcFinder.get(join(__dirname, 'fixtures/foo/bar.json'));
    expect(config).to.be(football);
  });
});