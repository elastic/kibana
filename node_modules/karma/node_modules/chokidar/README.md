# Chokidar
A neat wrapper around node.js fs.watch / fs.watchFile / fsevents.

[![NPM](https://nodei.co/npm-dl/chokidar.png)](https://nodei.co/npm/chokidar/)
[![NPM](https://nodei.co/npm/chokidar.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/chokidar/)

## Why?
Node.js `fs.watch`:

* Doesn't report filenames on OS X.
* Doesn't report events at all when using editors like Sublime on OS X.
* Often reports events twice.
* Emits most changes as `rename`.
* Has [a lot of other issues](https://github.com/joyent/node/search?q=fs.watch&type=Issues)
* Does not provide an easy way to recursively watch file trees.

Node.js `fs.watchFile`:

* Almost as bad at event handling.
* Also does not provide any recursive watching.
* Results in high CPU utilization.

Other node.js watching libraries:

* Are not using ultra-fast non-polling fsevents watcher implementation on OS X

Chokidar resolves these problems.

It is used in
[brunch](http://brunch.io),
[karma](http://karma-runner.github.io),
[PM2](https://github.com/Unitech/PM2),
[socketstream](http://www.socketstream.org), 
[derby](http://derbyjs.com/),
[watchify](https://github.com/substack/watchify),
and [many others](https://www.npmjs.org/browse/depended/chokidar/).
It has proven itself in production environments.

## Getting started
Install chokidar via node.js package manager:

    npm install chokidar

Then just require the package in your code:

```javascript
var chokidar = require('chokidar');

var watcher = chokidar.watch('file or dir', {ignored: /[\/\\]\./, persistent: true});

watcher
  .on('add', function(path) {console.log('File', path, 'has been added');})
  .on('addDir', function(path) {console.log('Directory', path, 'has been added');})
  .on('change', function(path) {console.log('File', path, 'has been changed');})
  .on('unlink', function(path) {console.log('File', path, 'has been removed');})
  .on('unlinkDir', function(path) {console.log('Directory', path, 'has been removed');})
  .on('error', function(error) {console.error('Error happened', error);})
  .on('ready', function() {console.info('Initial scan complete. Ready for changes.')})
  .on('raw', function(event, path, details) {console.info('Raw event info:', event, path, details)})

// 'add', 'addDir' and 'change' events also receive stat() results as second argument.
// http://nodejs.org/api/fs.html#fs_class_fs_stats
watcher.on('change', function(path, stats) {
  console.log('File', path, 'changed size to', stats.size);
});

watcher.add('new-file');
watcher.add(['new-file-2', 'new-file-3']);

// Only needed if watching is persistent.
watcher.close();

// One-liner
require('chokidar').watch('.', {ignored: /[\/\\]\./}).on('all', function(event, path) {
  console.log(event, path);
});

```

## API
* `chokidar.watch(paths, options)`: takes paths to be watched recursively and options:
    * `options.ignored` (regexp or function) files to be ignored.
      This function or regexp is tested against the **whole path**,
      not just filename. If it is a function with two arguments, it gets called
      twice per path - once with a single argument (the path), second time with
      two arguments (the path and the [`fs.Stats`](http://nodejs.org/api/fs.html#fs_class_fs_stats)
      object of that path).
    * `options.persistent` (default: `true`). Indicates whether the process
    should continue to run as long as files are being watched. If set to
    `false` when using `fsevents` to watch, no more events will be emitted
    after `ready`, even if the process continues to run.
    * `options.ignorePermissionErrors` (default: `false`). Indicates
    whether to watch files that don't have read permissions.
    * `options.ignoreInitial` (default: `false`). Indicates whether chokidar
    should ignore the initial `add` events or not.
    * `options.interval` (default: `100`). Interval of file system polling.
    * `options.binaryInterval` (default: `300`). Interval of file system
    polling for binary files (see extensions in src/is-binary).
    * `options.useFsEvents` (default: `true` on OS X). Whether to use the
    `fsevents` watching interface if available. When set to `true` and 
    `fsevents` is available this supercedes the `usePolling` setting.
    * `options.usePolling` (default: `false` on Windows, `true` on Linux and OS X).
    Whether to use fs.watchFile (backed by polling), or fs.watch. If polling
    leads to high CPU utilization, consider setting this to `false`. Polling
    may be necessary to successfully watch files in certain situation, such as
    network mounted drives.
    * `options.followSymlinks` (default: `true`). When `false`, only the
    symlinks themselves will be watched for changes instead of following
    the link references and bubbling events through the link's path.
    * `options.atomic` (default: `true` if `useFsEvents` and `usePolling` are `false`).
    Automatically filters out artifacts that occur when using editors that use
    "atomic writes" instead of writing directly to the source file.

`chokidar.watch()` produces an instance of `FSWatcher`. Methods of `FSWatcher`:

* `.add(file / files)`: Add directories / files for tracking.
Takes an array of strings (file paths) or just one path.
* `.on(event, callback)`: Listen for an FS event.
Available events: `add`, `addDir`, `change`, `unlink`, `unlinkDir`, `ready`, `raw`, `error`.
Additionally `all` is available which gets emitted with the underlying event name
and path for every event other than `ready`, `raw`, and `error`.
* `.close()`: Removes all listeners from watched files.

## License
The MIT license.

Copyright (c) 2014 Paul Miller (http://paulmillr.com) & Elan Shanker

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
