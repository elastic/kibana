var loadFunctions = require('./load_functions.js');
var functions  = loadFunctions('series_functions/');
var _ = require('lodash');


module.exports = (function () {
  var functionArray = _.map(functions, function (val, key) {
    // TODO: This won't work on frozen objects, it should be removed when everything is converted to datasources and chainables
    return _.extend({}, val, {name: key});
  });

  function toDocBlock(fn) {
    var help = '';

    if (fn.isAlias) return help;

    help += '#### .' + fn.name + '()\n';
    help += fn.help + '\n\n';

    // If chainable, drop first argument from help
    var args = fn.chainable ? fn.args.slice(1) : fn.args.slice();
    if (!args.length) {
      help += '*This function does not accept any arguments.*\n\n';
      return help;
    }

    help += 'Argument | Accepts | Description\n';
    help += '--- | --- | ---\n';

    _.each(args, function (arg) {
      help += arg.name + ' | *' + _.without(arg.types, 'null').join('/') + '* | ';
      help += arg.help ? arg.help : '*no help available*';
      help += '  \n';
    });

    help += '\n';

    return help;
  }

  function createDocs() {
    var help = '';
    help += '## Timelion function reference\n';
    help += 'This is the timelion function reference. Please note this document is auto generated from the Timelion' +
    ' code. Do not submit pulls against this document. You want to submit a pull against something in the ' +
    '`series_functions/` directory.\n\n';

    help += '### Data sources\n';

    help += _.chain(functionArray)
      .filter('datasource')
      .map(toDocBlock)
      .value()
      .join('');

    help += '### Chainable functions\n';

    help += _.chain(functionArray)
      .filter('chainable')
      .map(toDocBlock)
      .value()
      .join('');

    return help;
  }

  return createDocs();
}());
