'use strict';

let _ = require('lodash');
let nodemon = require('nodemon');
let join = require('path').join;
let relative = require('path').relative;
let normalize = require('path').normalize;
let ansicolors = require('ansicolors');

let root = join(__dirname, '..', '..');
let fromRoot = _.restParam(function (args) {
  return normalize(join.apply(null, [root].concat(args)));
});
let rel = _.partial(relative, root);
let crash = _.flow(ansicolors.white, ansicolors.bgRed)(' Kibana crashed ');
let restart = _.flow(ansicolors.black, ansicolors.bgGreen)(' Kibana restarted ');

nodemon({
  script: fromRoot('src/devServer/devServer.js'),
  watch: [
    fromRoot('src/'),
    '!' + fromRoot('src/plugins/*/public/**/*')
  ],
  ext: 'js,json,tmpl'
});

nodemon.on('crash', function () {
  console.log(crash);
});

nodemon.on('restart', function (files) {
  var prefix = files.length > 1 ? '\n - ' : '';
  var fileList = files.reduce(function (list, file, i, files) {
    return `${list || ''}${prefix}"${rel(file)}"`;
  }, '');

  console.log(`${restart} due to changes in ${fileList}`);
});
