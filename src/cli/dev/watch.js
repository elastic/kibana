'use strict';

let _ = require('lodash');
let nodemon = require('nodemon');
let join = require('path').join;
let relative = require('path').relative;
let normalize = require('path').normalize;
let ansicolors = require('ansicolors');

let root = join(__dirname, '..', '..', '..');
let fromRoot = _.restParam(function (segs) {
  return normalize(join.apply(null, [root].concat(segs)));
});
let rel = _.partial(relative, root);

let green = _.flow(ansicolors.black, ansicolors.bgGreen);
let red = _.flow(ansicolors.white, ansicolors.bgRed);
let yellow = _.flow(ansicolors.black, ansicolors.bgYellow);

let crash = red(' Kibana Crashed ');
let restart = yellow(' Kibana Restarted ');
let start = green(' Kibana Started ');
let args = _.without(process.argv.slice(2), '--watch');

console.log(yellow(' Kibana starting '), 'and watching for changes');

nodemon({
  script: fromRoot('src/cli/index.js'),
  args: args,
  watch: [
    fromRoot('src/'),
    fromRoot('config/'),
  ],
  ignore: fromRoot('src/**/public/'),
  ext: 'js,json,tmpl,yml'
});

nodemon.on('start', _.bindKey(console, 'log', start));
nodemon.on('crash', _.bindKey(console, 'log', crash));
nodemon.on('restart', function (files) {
  var prefix = files.length > 1 ? '\n - ' : '';
  var fileList = files.reduce(function (list, file, i, files) {
    return `${list || ''}${prefix}"${rel(file)}"`;
  }, '');

  console.log(`${restart} due to changes in ${fileList}`);
});
