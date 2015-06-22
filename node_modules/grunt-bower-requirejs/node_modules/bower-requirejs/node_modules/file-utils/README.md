file-utils [![](https://travis-ci.org/SBoudrias/file-utils.png)](https://travis-ci.org/SBoudrias/file-utils)
==========

This is a Grunt.file forks to allow the creation of scoped file utilities and the ability to add write filters.

Same as Grunt.file, this is a set of _synchronous_ utility. As so, it should **never** be used on a Node.js server. This is meant for users/command line utilities.


File API
=========

Upcoming. Meanwhile, check [Grunt.file documentation](http://gruntjs.com/api/grunt.file) as the same methods are available.

#### Setting options - `file.option( name, [ value ])`

```
// Set option
file.option('write', false);

// Get option
file.option('write');
```

**Available Options**
- `write` (Boolean): If write is set to `false`, then no file will be written or deleted. Useful for test run without side effets.
- `logger` (Logger object): Used internally to log information to the console. **API still work in progress**
- `encoding` (String): Defaults `utf8`. Set the default encoding used for reading/writing. Note most methods allow you to overwridde it for a single run.
- `force` (Boolean): `force: true` Force the deletion of folders and file outside the utility scope (or CWD if no scope).


ENV scope and filters
=========

### Creating an Env - file#createEnv([ options ]);

```javascript
var file = require('file-utils');

var env = file.createEnv({
  base: 'my/scoped/path',
  dest: 'destination/path' // optionnal
});

// Alternatively, they can be functions returning a path:

var env = file.createEnv({
  base: function() {
    return 'my/scoped/path';
  },
  dest: function() { // optionnal
    return 'destination/path';
  }
});
```

The `base` directory will prefix any paths passed to `mkdir`, `recurse`, `read`, `readJSON`, `write`, `delete`, `exists`, `isLink`, `isDir` and `isFile` methods.

The `dest` directory will prefix the `destination` path provided in the `copy` method. Note that this option is optionnal and will default to the current working directory.

If [options (`logger`, `write`, etc)](#setting-options---fileoption-name--value-) are not passed, each `Env` instance inherit those of its parent.

Write Filters
---------

Write filters are applied on `env.write` and `env.copy`.

They're used to modifiy the content or the filepath of a file.

#### Add a write filter - `env.registerWriteFilter( name, filter )`

**options**
- `name` (String): The name under which registering the filter
- `filter` (Function): The filter function

The filter function take a file object as parameter. This file object is a hash containing a `path` and a `contents` property. You can modify these two property as you like and returning the modified object.

```javascript
env.registerWriteFilter( 'coffee', function( file ) {
  if (!path.extname(file) !== '.js') return file;

  file.path = file.path.replace(/(\.js)$/, '.coffee');
  file.content = convertJsToCoffee( file.contents );

  return file;
});
```

#### Remove a write filter - `env.removeWriteFilter( name )`

```javascript
env.removeWriteFilter('coffee');
```

#### Async filter

The filter can also be asynchronous. This is done by calling `this.async()` and passing the return value to the callback provided.

```javascript
env.registerWriteFilter( 'coffee', function( file ) {
  var done = this.async();

  // some process
  setTimeout(function() {
    done({ path: '/newfile', contents: 'filtered content' });
  }, 1000);
});
```

**Caution:** Using an asynchronous filter will change the way write and copy method are called to. This will make both of those method to run asynchronously too.

Validation Filters
----------

Validation filters are applied on `env.write` and `env.copy`.

They're used to allow or disallow the write action.

#### Add a validation filter - `env.registerValidationFilter( name, filter )`

**options**
- `name` (String): The name under which registering the filter
- `filter` (Function): The filter function

The filter function take a file object as parameter. This file object is a hash containing a `path` (String) and a `contents` (String if text file, Buffer otherwise) property.

Return `true` to allow the file to be written. Return `false` or an error message `String` to disallow the write action.

```javascript
env.registerValidationFilter( 'checkConflicts', function( toOutput ) {
  if ( file.exists(toOutput.path) ) {
    return 'file is already present';
  }
  return true;
});
```

Just like the write filters, [this filter can be asynchronous](#async-filter).

#### Remove a validation filter - `env.removeValidationFilter( name )`

```javascript
env.removeValidationFilter('checkConflicts');
```


Todos
=========

- Real Logging system
