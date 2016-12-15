const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const grammar = fs.readFileSync(path.resolve(__dirname, '../../../public/chain.peg'), 'utf8');
const PEG = require('pegjs');
const Parser = PEG.buildParser(grammar);

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
