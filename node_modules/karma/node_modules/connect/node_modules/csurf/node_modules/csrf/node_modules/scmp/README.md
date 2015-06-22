# scmp [![Build Status](https://travis-ci.org/freewil/scmp.svg?branch=master)](https://travis-ci.org/freewil/scmp)

Safe, constant-time comparison of strings.

## Install

```
npm install scmp
```

## Why?

To minimize vulnerability against [timing attacks](http://codahale.com/a-lesson-in-timing-attacks/).

## Examples

```js
var scmp = require('scmp');

var hash      = 'e727d1464ae12436e899a726da5b2f11d8381b26';
var givenHash = 'e727e1b80e448a213b392049888111e1779a52db';

if (scmp(hash, givenHash)) {
  console.log('good hash');
} else {
  console.log('bad hash');
}

```
