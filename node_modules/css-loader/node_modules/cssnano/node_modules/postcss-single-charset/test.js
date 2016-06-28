"use strict";

var assert = require("assert");
var postcss = require("postcss");

var fixture = '.foo{color:red;}@charset "UTF-8";.bar{color:green;}@charset "EUC-JP";.baz{color:blue}';
var expected = '@charset "UTF-8";.foo{color:red;}.bar{color:green;}.baz{color:blue}';

var actual = postcss().use(require("./index")()).process(fixture).css;
assert.strictEqual(actual, expected, "should pop @charset.");

console.log("Ok");
