# glob-all

Provides a similar API to [glob](https://github.com/isaacs/node-glob), however instead of a single pattern, you may also use arrays of patterns.

### Install

```
npm install --save glob-all
```

### Usage

Given files:
```
files
├── a.txt
├── b.txt
├── c.txt
└── x
    ├── y.txt
    └── z.txt
```

We can:
``` js
var glob = require('glob-all');

var files = glob.sync([
  'files/**',      //include all     files/
  '!files/x/**',   //then, exclude   files/x/
  'files/x/z.txt'  //then, reinclude files/x/z.txt
]);

console.log(files);
```

Resulting in:
```
[ 'files',
  'files/a.txt',
  'files/b.txt',
  'files/c.txt',
  'files/x/z.txt' ]
```

### API

* Async - `glob(patterns[, options], callback)`
  * Returns a `GlobAll` instance which emits:
    * `match`
    * `error`
    * `end`

* Sync - `glob.sync(patterns[, options])`
  * Returns `[String]` or `null`

See [node-glob](https://github.com/isaacs/node-glob)

### Notes

#### Exclude Pattern

Since [node-glob](https://github.com/isaacs/node-glob) only allows one pattern, there is no such thing as an exclude pattern (like in Grunt and Gulp). However, in `node-glob-all` we allow exclusion of the results of an entire pattern by prefixing the pattern with `!`.

[node-glob](https://github.com/isaacs/node-glob) exclusions (`!` inside the pattern) to exclude a portion of the path will still work as expected.

#### File Order

If a file occurs in more than once in the set, the one with the **more precise pattern** will be used and the other will be thrown away. So, if you'd like a file be in a certain position, you could do:

``` js
var glob = require('glob-all');

var files = glob.sync([
  'files/x/y.txt',
  'files/**'
]);

console.log(files);
```

Which will bring `files/x/y.txt` to the top:

```
[ 'files/x/y.txt',
  'files',
  'files/a.txt',
  'files/b.txt',
  'files/c.txt',
  'files/x',
  'files/x/z.txt' ]
```

#### Filtering out directories

You can use the `mark` option to mark directories with a `/`, then you can:
``` js
files.filter(function(f) { return !/\/$/.test(f); });
```

#### Performance

Internally, `glob-all` uses the `statCache` option to prevent repeat lookups across multiple patterns.

#### Todo

* Implement `abort()`
* Add tests

#### Contributing

* `npm install`
* `npm start`
* Edit `src/index.coffee`

#### MIT License

Copyright &copy; 2014 Jaime Pillora &lt;dev@jpillora.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
