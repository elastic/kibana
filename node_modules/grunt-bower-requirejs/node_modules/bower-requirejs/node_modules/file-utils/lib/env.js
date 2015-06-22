'use strict';
var path = require('path');
var util = require('util');
var _ = require('lodash');
var File = require('./file');

module.exports = Env;

function Env(opt) {
  File.apply(this, arguments);

  this._base = opt.base || '';
  this._destBase = opt.dest || '';
  this._writeFilters = {};
  this._validationFilters = {};

  var methodsToPrefix = [ 'mkdir', 'recurse', 'read', 'readJSON', 'write', 'delete',
  'exists', 'isLink', 'isDir', 'isFile' ];

  // Prefix path arguments with this environment root dir
  methodsToPrefix.forEach(function(methodName) {
    this[methodName] = function() {
      var args = _.toArray(arguments);
      args[0] = this.fromBase(args[0]);
      return File.prototype[methodName].apply(this, args);
    };
  }.bind(this));

  this.copy = function() {
    var args = _.toArray(arguments);
    args[0] = this.fromBase(args[0]);
    args[1] = this.fromDestBase(args[1]);
    return File.prototype.copy.apply(this, args);
  };

  this._actualWrite = this.write;
  this.write = function(filepath, contents, options) {
    return this.applyWriteFilters({
      path: filepath,
      contents: contents
    }, this.applyValidationFilters, options);
  };
}

util.inherits(Env, File);

Env.prototype.setBase = function(filepath) {
  this._base = filepath;
};

// Return a path prefixed by the base (if not absolute)
Env.prototype.fromBase = function(filepath) {
  if (this.isPathAbsolute(filepath)) {
    return filepath;
  }
  return path.join(_.isFunction(this._base) ? this._base() : this._base, filepath);
};

Env.prototype.setDestBase = function(filepath) {
  this._destBase = filepath;
};

// Return a path prefixed by the destination base (if not absolute)
Env.prototype.fromDestBase = function(filepath) {
  if (this.isPathAbsolute(filepath)) {
    return filepath;
  }
  return path.join(_.isFunction(this._destBase) ? this._destBase() : this._destBase, filepath);
};

Env.prototype.registerWriteFilter = function(name, filter) {
  this._writeFilters[name] = filter;
};

Env.prototype.removeWriteFilter = function(name) {
  delete this._writeFilters[name];
};

Env.prototype.registerValidationFilter = function(name, filter) {
  this._validationFilters[name] = filter;
};

Env.prototype.removeValidationFilter = function(name) {
  delete this._validationFilters[name];
};


Env.prototype.applyWriteFilters = function(file, validate, options) {
  var writeFilters = _.reduce(this._writeFilters, function(m, v) { m.push(v); return m; }, []);
  if (!writeFilters.length) {
    return validate.call(this, file, options);
  }

  var i = 0;
  var output;
  var recurse = function(file) {
    i++;
    if (writeFilters[i]) {
      runAsync(writeFilters[i], recurse, file);
    } else {
      output = validate.call(this, file, options);
    }
  }.bind(this);

  runAsync(writeFilters[i], recurse, file);

  return output;
};

Env.prototype.applyValidationFilters = function( file, options ) {
  var validationFilters = _.reduce(this._validationFilters, function(m, v) { m.push(v); return m; }, []);
  if (!validationFilters.length) {
    return this._actualWrite.call(this, file.path, file.contents, options);
  }

  var i = 0;
  var output;
  var recurse = function(validated) {
    if ( validated !== true ) {
      return this.log.write(validated || 'Not actually writing to '+ file.path +' haven\'t pass validation' );
    }
    i++;
    if (validationFilters[i]) {
      runAsync(validationFilters[i], recurse, file);
    } else {
      output = this._actualWrite.call(this, file.path, file.contents, options);
    }
  }.bind(this);

  runAsync(validationFilters[i], recurse, file);

  return output;
};


/**
 * Allow a function to be run async by using `this.async()`. If not, then the function is
 * runned synchronously.
 * @param  {Function} func  The function to run
 * @param  {Function} cb    Callback to be provided even if the function is run sync
 * @param  {...rest}        Arguments passed to `func`
 * @return {null}
 */
function runAsync( func, cb ) {
  var rest = [];
  var len = 1;

  while ( len++ < arguments.length ) {
    rest.push( arguments[len] );
  }

  var async = false;
  var returnValue = func.apply({
    async: function() {
      async = true;
      return _.once(cb);
    }
  }, rest );

  // Note: Call the callback synchronously to keep the sync flow by default
  if ( !async ) {
    cb(returnValue);
  }
}
