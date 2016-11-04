let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let grammar = fs.readFileSync(path.resolve(__dirname, '../../../public/chain.peg'), 'utf8');
let PEG = require('pegjs');
let Parser = PEG.buildParser(grammar);

module.exports = function parseSheet(sheet) {
  return _.map(sheet, function (plot) {
    try {
      return Parser.parse(plot).tree;
    } catch (e) {
      let message;
      if (e.expected) {
        throw new Error('Expected: ' + e.expected[0].description + ' @ character ' + e.column);
      } else {
        throw e;
      }
    }
  });
};
