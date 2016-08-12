var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var grammar = fs.readFileSync(path.resolve(__dirname, '../../../public/chain.peg'), 'utf8');
var PEG = require('pegjs');
var Parser = PEG.buildParser(grammar);

module.exports = function parseSheet(sheet) {
  return _.map(sheet, function (plot) {
    try {
      return Parser.parse(plot).tree;
    } catch (e) {
      var message;
      if (e.expected) {
        throw new Error('Expected: ' + e.expected[0].description + ' @ character ' + e.column);
      } else {
        throw e;
      }
    }
  });
};
