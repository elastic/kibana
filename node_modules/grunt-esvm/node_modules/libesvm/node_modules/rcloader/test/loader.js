var RcLoader = require('../');
var fs = require('fs');
var _ = require('lodash');
var should = require('should');

var fixtures = {
  root: __dirname + '/fixtures/foo/foo/foo/foo/',
  json: __dirname + '/fixtures/foo/bar.json',
  text: __dirname + '/fixtures/foo/foo/.baz',
  rc: __dirname + '/.jshintrc',
  barJson: {
    baz: 'bog',
    strict: true
  }
};
fixtures.jshintrc = JSON.parse(fs.readFileSync(fixtures.rc));

describe('RcLoader', function () {
  it('loads a config file relative to another file', function () {
    var loader = new RcLoader('bar.json');
    loader.for(fixtures.root).should.eql(fixtures.barJson);
  });

  it('passes the constructors third arg to RcFinder', function () {
    var count = 0;
    var loader = new RcLoader('bar.json', null, {
      loader: function (path) {
        count ++;
        return JSON.parse(fs.readFileSync(path));
      }
    });
    loader.for(fixtures.root);
    count.should.eql(1);
  });

  it('merges in specified default values', function () {
    var loader = new RcLoader('.baz', { from: 'defaults' });
    loader.for(fixtures.root).should.eql({
      baz: 'poop',
      from: 'defaults'
    });
  });

  it('accepts a string which disables lookup and always responds with it\'s contents', function () {
    var loader = new RcLoader('.jshintrc', fixtures.json);
    loader.for(__filename).should.eql(fixtures.barJson);
  });

  it('does not lookup files when { lookup: false }', function (done) {
    var loader = new RcLoader('bar.json', { lookup: false }, {
      loader: function () {
        throw new Error('should not have been called');
      }
    });
    loader.for(fixtures.root, function (err, opts) {
      opts.should.eql({});
      done();
    });
  });

  it('accepts a path at { defaultFile: "..." }', function (done) {
    var loader = new RcLoader('bar.json', { defaultFile: __dirname + '/.jshintrc' });
    var count = 0;
    loader.for(fixtures.root, function (err, opts) {
      count.should.eql(1);
      opts.should.eql(_.merge({}, fixtures.jshintrc, fixtures.barJson));
      done();
    });
    count ++;
  });

  it('waits for the config to load before responding', function (done) {
    // write the time that different paths are looked-up and complete
    var start = {};
    var stop = {};

    var now = function () {
      var t = process.hrtime();
      return t[0] * 1000 + t[1] / 1000;
    };

    var onAfterDone = [];
    // loader with a defaults file which also looks up relative files
    var loader = new RcLoader('.jshintrc', {
      lookup: true,
      defaultFile: fixtures.json
    }, {
      loader: function (path, _cb) {
        start[path] = now();
        var done = function (err, contents) {
          stop[path] = now();
          onAfterDone.splice(0).forEach(function (fn) { fn(); });
          _cb(err, JSON.parse('' + contents));
        };

        if (path === fixtures.json) {
          done = _.partial(function forceCompletionOrder(origDone, err, contents) {
            (function checkThatRcStopped() {
              // only call the original done function once rc is done
              if (stop[fixtures.rc]) origDone(err, contents);

              // if not done yet then reschedule
              else onAfterDone.push(checkThatRcStopped);
            }());
          }, done);
        }

        fs.readFile(path, done);
      }
    });

    loader.for(fixtures.json, function (err, config) {
      should.not.exist(err);

      // bar.json file should have loaded successfully
      should.exist(start[fixtures.json]);
      should.exist(stop[fixtures.json]);

      // .jshintrc file should have loaded successfully
      should.exist(start[fixtures.rc]);
      should.exist(stop[fixtures.rc]);

      // .jshintrc file should have finished loading before the config
      stop[fixtures.rc].should.be.lessThan(stop[fixtures.json]);

      // but config should still include the non-overriden property
      config.baz.should.equal(fixtures.barJson.baz);

      // and config should have strict overriden
      config.strict.should.equal(fixtures.jshintrc.strict);

      done();
    });
  });
});
