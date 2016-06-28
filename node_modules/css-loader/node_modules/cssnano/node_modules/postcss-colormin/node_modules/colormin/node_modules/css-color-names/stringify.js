#!/usr/bin/env node
/**
 * given a file, or data over stdin,
 * split it on newlines and emit a json object kv
 */
var fs = require('fs');
var file = process.argv[2] || '/dev/stdin';

var arr = fs.readFileSync(file, 'utf-8').trim().split('\n');
var ret = {};

arr.forEach(function(line) {
  var s = line.split(' ');
  ret[s[0]] = s[1];
});

console.log(JSON.stringify(ret, null, 2));
