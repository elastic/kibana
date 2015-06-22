# lpad [![Build Status](https://secure.travis-ci.org/sindresorhus/lpad.png?branch=master)](http://travis-ci.org/sindresorhus/lpad)

Left pad each line in a string or stdout/stderr.

The stdout/stderr padding is especially useful in CLI tools when you don't directly control the output.


![screenshot](screenshot.png)


## Getting started

Install: `npm install lpad`


## Documentation


### lpad(string, pad)

Pads each line in a string with the supplied pad string.

#### Example

```js
var lpad = require('lpad');
var str = 'foo\nbar';

console.log(str);
/*
foo
bar
*/

console.log(lpad(str, '    '));
/*
    foo
    bar
*/
```

### lpad.stdout(pad)

Pads each line of `process.stdout` with the supplied pad string until the method is called again with no arguments.

#### Example

```js
var lpad = require('lpad');
var str = 'foo\nbar';

lpad.stdout('    ');  // start padding

console.log(str);
/*
    foo
    bar
*/

lpad.stdout();  // end padding

console.log(str);
/*
foo
bar
*/
```

### lpad.stderr(pad)

Pads each line of `process.stderr` with the supplied pad string until the method is called again with no arguments.


## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
(c) [Sindre Sorhus](http://sindresorhus.com)
