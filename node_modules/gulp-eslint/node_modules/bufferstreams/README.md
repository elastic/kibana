# BufferStreams

[![NPM version](https://img.shields.io/npm/v/bufferstreams.svg)](https://www.npmjs.com/package/bufferstreams)
[![Build Status](https://travis-ci.org/nfroidure/BufferStreams.svg?branch=master)](https://travis-ci.org/nfroidure/BufferStreams)
[![Dependency Status](https://img.shields.io/david/nfroidure/bufferstreams.svg?label=deps)](https://david-dm.org/nfroidure/bufferstreams)
[![devDependency Status](https://img.shields.io/david/dev/nfroidure/bufferstreams.svg?label=devDeps)](https://david-dm.org/nfroidure/bufferstreams#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/nfroidure/BufferStreams/badge.svg?branch=master)](https://coveralls.io/r/nfroidure/BufferStreams?branch=master)
[![Code Climate](https://codeclimate.com/github/nfroidure/BufferStreams/badges/gpa.svg)](https://codeclimate.com/github/nfroidure/BufferStreams)

BufferStreams abstracts streams to allow you to deal with their whole content in
 a single buffer when it becomes necessary (by example: a legacy library that
 do not support streams).

It is not a good practice, just some glue. Using BufferStreams means:
* there is no library dealing with streams for your needs
* you filled an issue to the wrapped library to support streams

## Usage
Install the [npm module](https://npmjs.org/package/bufferstreams):
```sh
npm install bufferstreams --save
```
Then, in your scripts:
```js
var BufferStreams = require('bufferstreams');

Fs.createReadStream('input.txt')
  .pipe(new BufferStreams(function(err, buf, cb) {

    // err will be filled with an error if the piped in stream emits one.
    if(err) {
      throw err;
    }

    // buf will contain the whole piped in stream contents
    buf = Buffer(buf.toString('utf-8').replace('foo', 'bar'));

    // cb is a callback to pass the result back to the piped out stream
    // first argument is an error that will be emitted if any
    // the second argument is the modified buffer
    cb(null, buf);

  }))
  .pipe(Fs.createWriteStream('output.txt'));
```

Note that you can use BufferStream with the objectMode option. In this case, the
 given buffer will be an array containing the streamed objects:
```js
new BufferStreams({objectMode: true}, myCallback);
```

## Contributing
Feel free to pull your code if you agree with publishing it under the MIT license.

