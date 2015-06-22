var util = require('util');
var log = require('./logger').create('reporter');
var MultiReporter = require('./reporters/multi');
var baseReporterDecoratorFactory = require('./reporters/base').decoratorFactory;
var SourceMapConsumer = require('source-map').SourceMapConsumer;

var createErrorFormatter = function(basePath, emitter, SourceMapConsumer) {
  var lastServedFiles = [];

  emitter.on('file_list_modified', function(filesPromise) {
    filesPromise.then(function(files) {
      lastServedFiles = files.served;
    });
  });

  var findFile = function(path) {
    for (var i = 0; i < lastServedFiles.length; i++) {
      if (lastServedFiles[i].path === path) {
        return lastServedFiles[i];
      }
    }
    return null;
  };

  var URL_REGEXP = new RegExp('http:\\/\\/[^\\/]*\\/' +
                              '(base|absolute)' + // prefix
                              '((?:[A-z]\\:)?[^\\?\\s\\:]*)' + // path
                              '(\\?\\w*)?' +      // sha
                              '(\\:(\\d+))?' +    // line
                              '(\\:(\\d+))?' +    // column
                              '', 'g');

  return function(msg, indentation) {
    // remove domain and timestamp from source files
    // and resolve base path / absolute path urls into absolute path
    msg = (msg || '').replace(URL_REGEXP, function(_, prefix, path, __, ___, line, ____, column) {

      if (prefix === 'base') {
        path = basePath + path;
      }

      var file = findFile(path);

      if (file && file.sourceMap) {
        line = parseInt(line || '0', 10);
        column = parseInt(column || '0', 10);

        var smc = new SourceMapConsumer(file.sourceMap);
        var original = smc.originalPositionFor({line: line, column: column});

        return util.format('%s:%d:%d <- %s:%d:%d', path, line, column, original.source,
            original.line, original.column);
      }

      return path + (line ? ':' + line : '') + (column ? ':' + column : '');
    });

    // indent every line
    if (indentation) {
      msg = indentation + msg.replace(/\n/g, '\n' + indentation);
    }

    return msg + '\n';
  };
};


var createReporters = function(names, config, emitter, injector) {
  var errorFormatter = createErrorFormatter(config.basePath, emitter, SourceMapConsumer);
  var reporters = [];

  // TODO(vojta): instantiate all reporters through DI
  names.forEach(function(name) {
    if (['dots', 'progress'].indexOf(name) !== -1) {
      var Cls = require('./reporters/' + name + (config.colors ? '_color' : ''));
      return reporters.push(new Cls(errorFormatter, config.reportSlowerThan));
    }

    var locals = {
      baseReporterDecorator: ['factory', baseReporterDecoratorFactory],
      formatError: ['value', errorFormatter]
    };

    try {
      reporters.push(injector.createChild([locals], ['reporter:' + name]).get('reporter:' + name));
    } catch (e) {
      if (e.message.indexOf('No provider for "reporter:' + name + '"') !== -1) {
        log.warn('Can not load "%s", it is not registered!\n  ' +
                 'Perhaps you are missing some plugin?', name);
      } else {
        log.warn('Can not load "%s"!\n  ' + e.stack, name);
      }
    }
  });

  // bind all reporters
  reporters.forEach(function(reporter) {
    emitter.bind(reporter);
  });

  return new MultiReporter(reporters);
};

createReporters.$inject = ['config.reporters', 'config', 'emitter', 'injector'];


// PUBLISH
exports.createReporters = createReporters;
