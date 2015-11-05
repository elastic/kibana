# gulp-eslint [![Build Status](https://travis-ci.org/adametry/gulp-eslint.svg)](https://travis-ci.org/adametry/gulp-eslint) [![Coverage Status](https://img.shields.io/coveralls/adametry/gulp-eslint.svg)](https://coveralls.io/r/adametry/gulp-eslint)

> A [gulp](http://gulpjs.com/) plugin for [ESLint](http://eslint.org/).

## Installation

[Use npm](https://docs.npmjs.com/cli/install).

```sh
npm install gulp-eslint
```

## Usage

```javascript
var gulp = require('gulp'),
    eslint = require('gulp-eslint');

gulp.task('lint', function () {
    return gulp.src(['js/**/*.js'])
        // eslint() attaches the lint output to the eslint property
        // of the file object so it can be used by other modules.
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failOnError last.
        .pipe(eslint.failOnError());
});

gulp.task('default', ['lint'], function () {
    // This will only run if the lint task is successful...
});
```

Or use the plugin API to do things like:

```javascript
gulp.src('js/**/*.js')
	.pipe(eslint({
		rulePaths: [
			'custom-rules/'
		],
		rules: {
			'my-custom-rule': 1,
			'strict': 2
		},
		globals: {
			'jQuery':false,
			'$':true
		},
		envs: [
			'browser'
		]
	}))
	.pipe(eslint.formatEach('compact', process.stderr));
```

## API

### eslint()

*No explicit configuration.* A `.eslintrc` file may be resolved relative to each linted file.

### eslint(options)

#### options.rulePaths

Type: `Array`

A list of rules file paths rules to import. For more information about rules, see the eslint [rules doc](https://github.com/eslint/eslint/wiki/Rules).

Type: `String` *(deprecated)*

Load a single rules file.

Alias: `rulesdir` *(deprecated)*

#### options.configFile

Type: `String`

Path to the eslint rules configuration file. For more information, see the eslint CLI [configFile option](https://github.com/nzakas/eslint/wiki/Command-line-interface#-c---config) and [configFile file info](https://github.com/nzakas/eslint/wiki/Command-line-interface#configuration-files). *Note:* This file must have a “.json” file extension.

#### options.reset

Type: `Boolean`

When true, eslint will not include its default set of rules when configured.

#### options.useEslintrc

Type: `Boolean`

When false, eslint will not load [.eslintrc](http://eslint.org/docs/configuring/).

Alias: `eslintrc` *(deprecated)*

#### options.rules

Type: `Object`

Set [configuration](http://eslint.org/docs/configuring/#configuring-rules) of [rules](http://eslint.org/docs/rules/).

```javascript
{
	"rules":{
		"camelcase": 1,
		"comma-dangle": 2,
		"quotes": 0
	}
}
```

#### options.globals

Type: `Object`

Specify [globals](http://eslint.org/docs/configuring/#specifying-globals).

```javascript
{
	"globals":{
		"jQuery": false,
		"$": true
	}
}
```

#### options.envs

Type: `Array`

Specify a list of [environments](http://eslint.org/docs/configuring/#specifying-environments) to be applied.

Type: `Object`

Specify [environments](http://eslint.org/docs/configuring/#specifying-environments). Each key must match an existing env definition, and the key determines whether the env’s rules are applied (`true`) or not (`false`).

Alias: `env` *(deprecated)*

### eslint(configFilePath)

Type: `String`

Shorthand for defining `options.configFile`.

### eslint.failOnError()

Stop a task/stream if an eslint error has been reported for any file.

```javascript
// Cause the stream to stop(/fail) before copying an invalid JS file to the output directory
gulp.src('**/*.js')
	.pipe(eslint())
	.pipe(eslint.failOnError())
	.pipe(gulp.dest('../output'));
```

### eslint.failAfterError()

Stop a task/stream if an eslint error has been reported for any file, but wait for all of them to be processed first.

```javascript
// Cause the stream to stop(/fail) when the stream ends if any eslint error(s) occurred.
gulp.src('**/*.js')
	.pipe(eslint())
	.pipe(eslint.failAfterError())
	.pipe(gulp.dest('../output'));
```

### eslint.format(formatter, output)

Format all linted files once. This should be used in the stream after piping through `eslint`; otherwise, this will find no eslint results to format.

The `formatter` argument may be a `String`, `Function`, or `undefined`. As a `String`, a formatter module by that name or path will be resolved as a module, relative to `process.cwd()`, or as one of the [eslint-provided formatters](https://github.com/nzakas/eslint/tree/master/lib/formatters). If `undefined`, the eslint “stylish” formatter will be resolved. A `Function` will be called with an `Array` of file linting results to format.

```javascript
// use the default "stylish" eslint formatter
eslint.format()

// use the "checkstyle" eslint formatter
eslint.format('checkstyle')

// use the "eslint-path-formatter" module formatter
// (@see https://github.com/Bartvds/eslint-path-formatter)
eslint.format('eslint-path-formatter')
```

The `output` argument may be a `WritableStream`, `Function`, or `undefined`. As a `WritableStream`, the formatter results will be written to the stream. If `undefined`, the formatter results will be written to [gulp’s log](https://github.com/wearefractal/gulp-util#logmsg). A `Function` will be called with the formatter results as the only parameter.

```javascript
// write to gulp's log (default)
eslint.format();

// write messages to stdout
eslint.format('junit', process.stdout)
``` 

### eslint.formatEach(formatter, output)

Format each linted file individually. This should be used in the stream after piping through `eslint`; otherwise, this will find no eslint results to format.

The arguments for `formatEach` are the same as the arguments for `format`.


##Configuration

Eslint may be theured explicity by using any of the following plugin options: `config`, `rules`, `globals`, or `env`. When not configured in this way, eslint will attempt to resolve a file by the name of `.eslintrc` within the same directory as the file to be linted. If not found there, parent directories will be searched until `.eslintrc` is found or the directory root is reached. Any configuration will expand upon the [default eslint configuration](https://github.com/nzakas/eslint/wiki/Rules).

##Ignore Files

Eslint will ignore files that do not have a `.js` file extension at the point of linting ([some plugins](https://github.com/wearefractal/gulp-coffee) may change file extensions mid-stream). This avoids unintentional linting of non-JavaScript files.

Eslint will also detect an `.eslintignore` file when a directory passes through the pipeline. All subsequent files that pass through may be skipped if they match any pattern found in this file. The file may contain multiple globs as strings within a JSON array:

```javascript
['**/*.min.js','output/**/*']
```
