# download [![Build Status](https://travis-ci.org/kevva/download.svg?branch=master)](https://travis-ci.org/kevva/download)

> Download and extract files effortlessly

## Install

```bash
$ npm install --save download
```

## Usage

If you're fetching an archive you can set `extract: true` in options and
it'll extract it for you.

```js
var download = require('download');

// download and extract `foo.tar.gz` into `bar/`
download('foo.tar.gz', 'bar', { extract: true });

// download and save `foo.exe` into `bar/foo.exe` with mode `0755`
download('foo.exe', 'bar', { mode: '0755' });

// download and save `foo.zip` into `bar/foobar.zip`
download({ url: 'foo.zip', name: 'foobar.zip' }, 'bar');

// download and save an array of files in `bar/`
var files = ['foo.jpg', 'bar.jpg', 'cat.jpg'];
download(files, 'bar');

// download, save and rename an array of files in `bar/`
var files = [{
    url: 'foo.jpg',
    name: 'foobar.jpg'
}, {
    url: 'cat.jpg',
    name: 'dog.jpg'
}];
download(files, 'bar');
```

## API

### download(url, dest, opts)

Download a file or an array of files to a given destination. Returns an EventEmitter
that emits the following possible events:

* `response` — Relayed when the underlying `http.ClientRequest` emits the same
event. Listeners called with a `http.IncomingMessage` instance.
* `data` — Relayed when the underlying `http.IncomingMessage` emits the same
event. Listeners called with a `Buffer` instance.
* `error` — Relayed when the underlying `http.ClientRequest` emits the same event
or when the response status code is not in the 200s. Listeners called with an
`Error` instance (in the first case) or the response status code.
* `close` — Relayed when the underlying `stream.Duplex` emits the same event.

## Options

You can define options accepted by the [request](https://github.com/mikeal/request/) module besides from the options below.

### extract  

Type: `Boolean`  
Default: `false`

If set to `true`, try extracting the file using [decompress](https://github.com/kevva/decompress/).

### ext  

Type: `String`  
Default: `undefined`

Sometimes you may be downloading an `application/octet-stream` and you want to 
extract it, eg it may be a zip, this option allows you to specify the extention 
of the file to be downloaded.

### mode  

Type: `String`  
Default: `undefined`

Set mode on the downloaded files.

### strip  

Type: `Number`  
Default: `0`

Equivalent to `--strip-components` for tar.

## CLI

```bash
$ npm install --global download
```

```bash
$ download --help

Usage
  $ download <url>
  $ cat <file> | download>

Example
  $ download --out dist --extract https://github.com/kevva/download/archive/master.zip
  $ cat urls.txt | download --out dist

Options
  -e, --extract           Extract archive files on download
  -o, --out               Path to download or extract the files to
  -s, --strip <number>    Strip path segments from root when extracting
```

## License

MIT © [Kevin Mårtensson](http://kevinmartensson.com)
