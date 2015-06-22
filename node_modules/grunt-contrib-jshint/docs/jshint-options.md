# Options

Any specified option will be passed through directly to [JSHint][], thus you can specify any option that JSHint supports. See the [JSHint documentation][] for a list of supported options.

[JSHint]: http://www.jshint.com/
[JSHint documentation]: http://www.jshint.com/docs/

A few additional options are supported:

## globals
Type: `Object`
Default value: `null`

A map of global variables, with keys as names and a boolean value to determine if they are assignable. This is not a standard JSHint option, but is passed into the `JSHINT` function as its third argument. See the [JSHint documentation][] for more information.

## jshintrc
Type: `String` or `true`
Default value: `null`

If set to `true`, no config will be sent to jshint and jshint will search for `.jshintrc` files relative to the flies being linted.

If a filename is specified, options and globals defined therein will be used. The `jshintrc` file must be valid JSON and looks something like this:

```json
{
  "curly": true,
  "eqnull": true,
  "eqeqeq": true,
  "undef": true,
  "globals": {
    "jQuery": true
  }
}
```

*Be aware that `jshintrc` settings are not merged with your Grunt options.*

## extensions
Type: `String`
Default value: `''`

A list of non-dot-js extensions to check.

## ignores
Type: `Array`
Default value: `null`

A list of files and dirs to ignore. This will override your `.jshintignore` file if set and does not merge.

## force
Type: `Boolean`
Default value: `false`

Set `force` to `true` to report JSHint errors but not fail the task.

## reporter
Type: `String`
Default value: `null`

Allows you to modify this plugins output. By default it will use a built-in Grunt reporter. Set the path to your own custom reporter or to one of the built-in JSHint reporters: `jslint` or `checkstyle`.

See also: [Writing your own JSHint reporter.](http://jshint.com/docs/reporters/)

## reporterOutput
Type: `String`
Default value: `null`

Specify a filepath to output the results of a reporter. If `reporterOutput` is specified then all output will be written to the given filepath instead of printed to stdout.
