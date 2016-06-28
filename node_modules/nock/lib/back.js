'use strict';

var nock = require('./scope');
var recorder = require('./recorder');

var fs = require('fs');
var format = require('util').format;
var mkdirp = require('mkdirp');
var path = require('path');
var expect = require('chai').expect;
var debug = require('debug')('nock.back');

var _mode = null;



/**
 * nock the current function with the fixture given
 *
 * @param {string}   fixtureName  - the name of the fixture, e.x. 'foo.json'
 * @param {object}   options      - [optional], extra options for nock with, e.x. { assert: true }
 * @param {function} nockedFn     - the callback function to be executed with the given fixture being loaded,
 *                                  the function will be called with { scopes: loaded_nocks || [] } set as this
 *
 *
 * List of options:
 *
 * @param {function} before       - a preprocessing function, gets called before nock.define
 * @param {function} after        - a postprocessing function, gets called after nock.define
 *
 */
function Back (fixtureName, options, nockedFn) {
  if(!Back.fixtures) {
    throw new Error(  'Back requires nock.back.fixtures to be set\n' +
                      'Ex:\n' +
                      '\trequire(nock).back.fixtures = \'/path/to/fixures/\'');
  }

  if( arguments.length === 2 ) {
    nockedFn = options;
    options = {};
  }

  _mode.setup();

  var fixture = path.join(Back.fixtures, fixtureName)
    , context = _mode.start(fixture, options);


  var nockDone = function () {
    _mode.finish(fixture, options, context);
  };

  debug('context:', context);

  nockedFn.call(context, nockDone);
}




/*******************************************************************************
*                                    Modes                                     *
*******************************************************************************/


var wild = {


  setup: function () {
    nock.cleanAll();
    recorder.restore();
    nock.activate();
    nock.enableNetConnect();
  },


  start: function () {
    return load(); //don't load anything but get correct context
  },


  finish: function () {
    //nothing to do
  }


};




var dryrun = {


  setup: function () {
    recorder.restore();
    nock.cleanAll();
    nock.activate();
    //  We have to explicitly enable net connectivity as by default it's off.
    nock.enableNetConnect();
  },


  start: function (fixture, options) {
    var contexts = load(fixture, options);

    nock.enableNetConnect();
    return contexts;
  },


  finish: function () {
    //nothing to do
  }


};




var record = {


  setup: function () {
    recorder.restore();
    recorder.clear();
    nock.cleanAll();
    nock.activate();
    nock.disableNetConnect();
  },


  start: function (fixture, options) {
    var context = load(fixture, options);

    if( !context.isLoaded ) {
      recorder.record({
        dont_print: true,
        output_objects: true
      });

      context.isRecording = true;
    }

    return context;
  },


  finish: function (fixture, options, context) {
    if( context.isRecording ) {
      var outputs = JSON.stringify(recorder.outputs(), null, 4);
      debug('recorder outputs:', outputs);

      mkdirp.sync(path.dirname(fixture));
      fs.writeFileSync(fixture, outputs);
    }
  }


};




var lockdown = {


  setup: function () {
    recorder.restore();
    recorder.clear();
    nock.cleanAll();
    nock.activate();
    nock.disableNetConnect();
  },


  start: function (fixture, options) {
    return load(fixture, options);
  },


  finish: function () {
    //nothing to do
  }


};




function load (fixture, options) {
  var context = {
    scopes : [],
    assertScopesFinished: function () {
      assertScopes(this.scopes, fixture);
    }
  };

  if( fixture && fixtureExists(fixture) ) {
    var scopes = nock.loadDefs(fixture);
    applyHook(scopes, options.before);

    scopes = nock.define(scopes);
    applyHook(scopes, options.after);

    context.scopes = scopes;
    context.isLoaded = true;
  }


  return context;
}




function applyHook(scopes, fn) {
  if( !fn ) {
    return;
  }

  if( typeof fn !== 'function' ) {
    throw new Error ('processing hooks must be a function');
  }

  scopes.forEach(fn);
}




function fixtureExists(fixture) {
  return fs.existsSync(fixture);
}




function assertScopes (scopes, fixture) {
  scopes.forEach(function (scope) {
    expect( scope.isDone() )
    .to.be.equal(
      true,
      format('%j was not used, consider removing %s to rerecord fixture', scope.pendingMocks(), fixture)
    );
  });
}




var Modes = {

  wild: wild, //all requests go out to the internet, dont replay anything, doesnt record anything

  dryrun: dryrun, //use recorded nocks, allow http calls, doesnt record anything, useful for writing new tests (default)

  record: record, //use recorded nocks, record new nocks

  lockdown: lockdown, //use recorded nocks, disables all http calls even when not nocked, doesnt record

};





Back.setMode = function(mode) {
  if( !Modes.hasOwnProperty(mode) ) {
    throw new Error ('some usage error');
  }

  Back.currentMode = mode;
  debug('New nock back mode:', Back.currentMode);

  _mode = Modes[mode];
  _mode.setup();
};




Back.fixtures = null;
Back.currentMode = null;
Back.setMode(process.env.NOCK_BACK_MODE || 'dryrun');

module.exports = exports = Back;
