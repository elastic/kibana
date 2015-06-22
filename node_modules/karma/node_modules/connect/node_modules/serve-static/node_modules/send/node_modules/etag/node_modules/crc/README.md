# crc

[![GitTip](http://img.shields.io/gittip/alexgorbatchev.svg?style=flat)](https://www.gittip.com/alexgorbatchev/)
[![Dependency status](http://img.shields.io/david/alexgorbatchev/node-crc.svg?style=flat)](https://david-dm.org/alexgorbatchev/node-crc)
[![devDependency Status](http://img.shields.io/david/dev/alexgorbatchev/node-crc.svg?style=flat)](https://david-dm.org/alexgorbatchev/node-crc#info=devDependencies)
[![Build Status](http://img.shields.io/travis/alexgorbatchev/node-crc.svg?style=flat&branch=master)](https://travis-ci.org/alexgorbatchev/node-crc)

[![NPM](https://nodei.co/npm/node-crc.svg?style=flat)](https://npmjs.org/package/node-crc)

Module for calculating Cyclic Redundancy Check (CRC).

## Features

* Version 3 is 3-4 times faster than version 2.
* Pure JavaScript implementation, no dependencies.
* Provides CRC Tables for optimized calculations.
* Provides support for the following CRC algorithms:
  * CRC1 `crc.crc1(…)`
  * CRC8 `crc.crc8(…)`
  * CRC8 1-Wire `crc.crc81wire(…)`
  * CRC16 `crc.crc16(…)`
  * CRC16 CCITT `crc.crc16ccitt(…)`
  * CRC16 Modbus `crc.crc16modbus(…)`
  * CRC24 `crc.crc24(…)`
  * CRC32 `crc.crc32(…)`

## Installation

    npm install crc

## Running tests

    $ npm install
    $ npm test

## Usage Example

Calculate a CRC32:

    var crc = require('crc');

    crc.crc32('hello').toString(16);
    # => "3610a686"

Calculate a CRC32 of a file:

    crc.crc32(fs.readFileSync('README.md', 'utf8')).toString(16);
    # => "127ad531"

Or using a `Buffer`:

    crc.crc32(fs.readFileSync('README.md')).toString(16);
    # => "127ad531"

Incrementally calculate a CRC32:

    value = crc32('one');
    value = crc32('two', value);
    value = crc32('three', value);
    value.toString(16);
    # => "09e1c092"

## Thanks!

[pycrc](http://www.tty1.net/pycrc/) library is which the source of all of the CRC tables.

# License

The MIT License (MIT)

Copyright (c) 2014 Alex Gorbatchev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
