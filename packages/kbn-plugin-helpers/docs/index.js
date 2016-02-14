var join = require('path').join;
var readFileSync = require('fs').readFileSync;

function indent(txt, n) {
  var space = (new Array(n + 1)).join(' ');
  return space + txt.split('\n').join('\n' + space);
}

module.exports = function (name) {
  return function () {
    var md = readFileSync(join(__dirname, name + '.md'), 'utf8');

    console.log('\n  Docs:');
    console.log('');
    console.log(indent(md, 4));
    console.log('');
  };
};
