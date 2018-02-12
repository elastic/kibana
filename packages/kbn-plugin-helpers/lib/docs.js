const resolve = require('path').resolve;
const readFileSync = require('fs').readFileSync;

function indent(txt, n) {
  const space = (new Array(n + 1)).join(' ');
  return space + txt.split('\n').join('\n' + space);
}

module.exports = function docs(name) {
  const md = readFileSync(resolve(__dirname, '../tasks', name, 'README.md'), 'utf8');

  return function () {
    console.log('\n  Docs:');
    console.log('');
    console.log(indent(md, 4));
    console.log('');
  };
};
