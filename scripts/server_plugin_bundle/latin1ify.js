/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// V8 stores a script source as Latin-1 until one codepoint above U+00FF, then
// the whole string becomes UTF-16. SWC asciiOnly escapes ordinary strings but
// leaves template-literal text alone. dedent reads strings.raw, so a backslash
// escape would change the runtime text; splice an interpolation instead.
var fs = require('fs');
var acorn = require('acorn');

var file = process.argv[2];
if (!file) {
  console.error('usage: latin1ify.js <file>');
  process.exit(1);
}

var input = fs.readFileSync(file, 'utf8');

function hex(cp) {
  return cp.toString(16).padStart(4, '0');
}

function rewriteChars(text, replace) {
  var out = '';
  var count = 0;
  var i = 0;
  var cp;
  var width;
  for (i = 0; i < text.length; ) {
    cp = text.codePointAt(i);
    width = cp > 0xffff ? 2 : 1;
    if (cp > 0xff) {
      out += replace(cp);
      count++;
    } else {
      out += text.slice(i, i + width);
    }
    i += width;
  }
  return { out: out, count: count };
}

function rewriteString(text) {
  var quote = text.charAt(0);
  var body = text.slice(1, -1);
  var out = quote;
  var count = 0;
  var i = 0;
  var cp;
  var width;
  for (i = 0; i < body.length; ) {
    if (body.charAt(i) === '\\') {
      out += body.charAt(i) + (body.charAt(i + 1) || '');
      i += 2;
      continue;
    }
    cp = body.codePointAt(i);
    width = cp > 0xffff ? 2 : 1;
    if (cp > 0xff) {
      out += '\\u' + hex(cp);
      count++;
    } else {
      out += body.slice(i, i + width);
    }
    i += width;
  }
  return { out: out + text.charAt(text.length - 1), count: count };
}

function templateReplacement(cp) {
  return '${"\\u' + hex(cp) + '"}';
}

function rewriteTemplate(text) {
  return rewriteChars(text, templateReplacement);
}

function rewriteRegexp(text) {
  var out = '';
  var count = 0;
  var i = 0;
  var cp;
  var width;
  for (i = 0; i < text.length; ) {
    if (text.charAt(i) === '\\') {
      out += text.charAt(i) + (text.charAt(i + 1) || '');
      i += 2;
      continue;
    }
    cp = text.codePointAt(i);
    width = cp > 0xffff ? 2 : 1;
    if (cp > 0xff) {
      out += '\\u' + hex(cp);
      count++;
    } else {
      out += text.slice(i, i + width);
    }
    i += width;
  }
  return { out: out, count: count };
}

function commentReplacement(cp) {
  return '\\u' + hex(cp);
}

function rewriteGap(text) {
  // Between tokens: whitespace and comments. A non-Latin-1 comment character
  // becomes the ASCII text \uXXXX so the comment stays a comment.
  return rewriteChars(text, commentReplacement);
}

function emptyReplacement() {
  return '';
}

var out = '';
var last = 0;
var replaced = { string: 0, template: 0, regexp: 0, gap: 0 };
var tokenizer = acorn.tokenizer(input, {
  ecmaVersion: 'latest',
  allowHashBang: true,
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowImportExportEverywhere: true,
  allowSuperOutsideMethod: true,
});
var token;
var gap;
var slice;
var label;
var rewritten;
var bad;

for (token of tokenizer) {
  if (token.start > last) {
    gap = rewriteGap(input.slice(last, token.start));
    replaced.gap += gap.count;
    out += gap.out;
  }
  slice = input.slice(token.start, token.end);
  label = token.type.label;
  rewritten = { out: slice, count: 0 };
  if (label === 'string') rewritten = rewriteString(slice);
  else if (label === 'template') rewritten = rewriteTemplate(slice);
  else if (label === 'regexp') rewritten = rewriteRegexp(slice);
  else if (label === 'name' || label === 'privateId') {
    bad = rewriteChars(slice, emptyReplacement);
    if (bad.count) {
      throw new Error('non-latin1 identifier at ' + token.start + ': ' + JSON.stringify(slice));
    }
  }
  if (label === 'string') replaced.string += rewritten.count;
  if (label === 'template') replaced.template += rewritten.count;
  if (label === 'regexp') replaced.regexp += rewritten.count;
  out += rewritten.out;
  last = token.end;
}

if (last < input.length) {
  gap = rewriteGap(input.slice(last));
  replaced.gap += gap.count;
  out += gap.out;
}

var above = 0;
var i = 0;
var cp;
for (i = 0; i < out.length; ) {
  cp = out.codePointAt(i);
  if (cp > 0xff) above++;
  i += cp > 0xffff ? 2 : 1;
}
if (above) {
  console.error('still non-latin1', above);
  process.exit(1);
}

fs.writeFileSync(file, out);
console.log(
  JSON.stringify({
    inBytes: Buffer.byteLength(input),
    outBytes: Buffer.byteLength(out),
    replaced: replaced,
  })
);
