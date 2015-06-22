# multiparty [![Build Status](https://travis-ci.org/andrewrk/node-multiparty.svg?branch=master)](https://travis-ci.org/andrewrk/node-multiparty) [![NPM version](https://badge.fury.io/js/multiparty.svg)](http://badge.fury.io/js/multiparty)

Parse http requests with content-type `multipart/form-data`, also known as file uploads.

See also [busboy](https://github.com/mscdex/busboy) - a
[faster](https://github.com/mscdex/dicer/wiki/Benchmarks) alternative
which may be worth looking into.

### Why the fork?

 * This module uses the Node.js v0.10 streams properly, *even in Node.js v0.8*
 * It will not create a temp file for you unless you want it to.
 * Counts bytes and does math to help you figure out the `Content-Length` of
   each part.
 * You can easily stream uploads to s3 with
   [knox](https://github.com/LearnBoost/knox), for [example](examples/s3.js).
 * Less bugs. This code is simpler, has all deprecated functionality removed,
   has cleaner tests, and does not try to do anything beyond multipart stream
   parsing.

## Installation

```
npm install multiparty
```

## Usage

 * See [examples](examples).

Parse an incoming `multipart/form-data` request.

```js
var multiparty = require('multiparty')
  , http = require('http')
  , util = require('util')

http.createServer(function(req, res) {
  if (req.url === '/upload' && req.method === 'POST') {
    // parse a file upload
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      res.end(util.inspect({fields: fields, files: files}));
    });

    return;
  }

  // show a file upload form
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/upload" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="title"><br>'+
    '<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
}).listen(8080);
```

## API

### multiparty.Form
```js
var form = new multiparty.Form(options)
```
Creates a new form. Options:

 * `encoding` - sets encoding for the incoming form fields. Defaults to `utf8`.
 * `maxFieldsSize` - Limits the amount of memory a field (not a file) can
   allocate in bytes. If this value is exceeded, an `error` event is emitted.
   The default size is 2MB.
 * `maxFields` - Limits the number of fields that will be parsed before
   emitting an `error` event. A file counts as a field in this case.
   Defaults to 1000.
 * `maxFilesSize` - Only relevant when `autoFiles` is `true`.  Limits the
   total bytes accepted for all files combined. If this value is exceeded,
   an `error` event is emitted. The default is `Infinity`.
 * `autoFields` - Enables `field` events. This is automatically set to `true`
   if you add a `field` listener.
 * `autoFiles` - Enables `file` events. This is automatically set to `true`
   if you add a `file` listener.
 * `uploadDir` - Only relevant when `autoFiles` is `true`. The directory for
   placing file uploads in. You can move them later using `fs.rename()`.
   Defaults to `os.tmpDir()`.
 * `hash` - Only relevant when `autoFiles` is `true`. If you want checksums
   calculated for incoming files, set this to either `sha1` or `md5`.
   Defaults to off.

#### form.parse(request, [cb])

Parses an incoming node.js `request` containing form data.This will cause
`form` to emit events based off the incoming request.

```js
var count = 0;
var form = new multiparty.Form();

// Errors may be emitted
form.on('error', function(err) {
  console.log('Error parsing form: ' + err.stack);
});

// Parts are emitted when parsing the form
form.on('part', function(part) {
  // You *must* act on the part by reading it
  // NOTE: if you want to ignore it, just call "part.resume()"

  if (part.filename === null) {
    // filename is "null" when this is a field and not a file
    console.log('got field named ' + part.name);
    // ignore field's content
    part.resume();
  }

  if (part.filename !== null) {
    // filename is not "null" when this is a file
    count++;
    console.log('got file named ' + part.name);
    // ignore file's content here
    part.resume();
  }
});

// Close emitted after form parsed
form.on('close', function() {
  console.log('Upload completed!');
  res.setHeader('text/plain');
  res.end('Received ' + count + ' files');
});

// Parse req
form.parse(req);

```

If `cb` is provided, `autoFields` and `autoFiles` are set to `true` and all
fields and files are collected and passed to the callback, removing the need to
listen to any events on `form`. This is for convenience when wanted to read
everything, but be careful as this will write all uploaded files to the disk,
even ones you may not be interested in.

```js
form.parse(req, function(err, fields, files) {
  Object.keys(fields).forEach(function(name) {
    console.log('got field named ' + name);
  });

  Object.keys(files).forEach(function(name) {
    console.log('got file named ' + name);
  });

  console.log('Upload completed!');
  res.setHeader('text/plain');
  res.end('Received ' + files.length + ' files');
});
```

`fields` is an object where the property names are field names and the values
are arrays of field values.

`files` is an object where the property names are field names and the values
are arrays of file objects.

#### form.bytesReceived

The amount of bytes received for this form so far.

#### form.bytesExpected

The expected number of bytes in this form.

### Events

#### 'error' (err)

Unless you supply a callback to `form.parse`, you definitely want to handle
this event. Otherwise your server *will* crash when users submit bogus
multipart requests!

Only one 'error' event can ever be emitted, and if an 'error' event is
emitted, then 'close' will not be emitted.

#### 'part' (part)

Emitted when a part is encountered in the request. `part` is a
`ReadableStream`. It also has the following properties:

 * `headers` - the headers for this part. For example, you may be interested
   in `content-type`.
 * `name` - the field name for this part
 * `filename` - only if the part is an incoming file
 * `byteOffset` - the byte offset of this part in the request body
 * `byteCount` - assuming that this is the last part in the request,
   this is the size of this part in bytes. You could use this, for
   example, to set the `Content-Length` header if uploading to S3.
   If the part had a `Content-Length` header then that value is used
   here instead.

#### 'aborted'

Emitted when the request is aborted. This event will be followed shortly
by an `error` event. In practice you do not need to handle this event.

#### 'progress' (bytesReceived, bytesExpected)

#### 'close'

Emitted after all parts have been parsed and emitted. Not emitted if an `error`
event is emitted. This is typically when you would send your response.

#### 'file' (name, file)

**By default multiparty will not touch your hard drive.** But if you add this
listener, multiparty automatically sets `form.autoFiles` to `true` and will
stream uploads to disk for you. 

**The max bytes accepted per request can be specified with `maxFilesSize`.**

 * `name` - the field name for this file
 * `file` - an object with these properties:
   - `fieldName` - same as `name` - the field name for this file
   - `originalFilename` - the filename that the user reports for the file
   - `path` - the absolute path of the uploaded file on disk
   - `headers` - the HTTP headers that were sent along with this file
   - `size` - size of the file in bytes

If you set the `form.hash` option, then `file` will also contain a `hash`
property which is the checksum of the file.

#### 'field' (name, value)

 * `name` - field name
 * `value` - string field value

