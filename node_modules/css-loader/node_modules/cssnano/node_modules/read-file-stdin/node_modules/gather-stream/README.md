# gather-stream

Basically [concat-stream](https://github.com/maxogden/concat-stream) but minimaller implementation, and/but also with error handling.


## Usage

Here's a simple example:

  var concat2 = require('gather-stream'),
      fs = require('fs');

  fs.createReadStream('README.md').pipe(concat2(function (error,buffer) {
    if (error) console.error(error);
    else console.log("Read file, it was %s bytes long.", buffer.length);
  });


## API

* `var concat2 = require('gather-stream')` — the module exports a single wrapper function
* `concat2([opts, ]cb)` — returns a Writable stream you can pipe into. If an error occurs on this stream *or* its source, `cb(error)` will be called; otherwise `cb(null, buffer)` will get you. You can provide `{maxLength:someNumberOfBytes}` as `opts` to limit memory mayhem if you wish — if the limit is about to be exceeded, an error will be fired instead.
* that's about it


## License

Copyright © 2014, Nathan Vander Wilt

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
