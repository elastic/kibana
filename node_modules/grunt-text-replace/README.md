# grunt-text-replace [!['Build status'][travis_image_url]][travis_page_url]

[travis_image_url]: https://api.travis-ci.org/yoniholmes/grunt-text-replace.png
[travis_page_url]: https://travis-ci.org/yoniholmes/grunt-text-replace

Replace text in files using strings, regexs or functions.

## Installation
In your project's [gruntfile][getting_started] directory, run:

```bash
npm install grunt-text-replace --save-dev
```

Then add this line to your project's [gruntfile][getting_started]:

```javascript
grunt.loadNpmTasks('grunt-text-replace');
```

[grunt]: http://gruntjs.com/
[getting_started]: https://github.com/gruntjs/grunt/wiki/Getting-started#the-gruntfile


## Usage


```javascript
replace: {
  example: {
    src: ['text/*.txt'],             // source files array (supports minimatch)
    dest: 'build/text/',             // destination directory or file
    replacements: [{
      from: 'Red',                   // string replacement
      to: 'Blue'
    }, {
      from: /(f|F)(o{2,100})/g,      // regex replacement ('Fooo' to 'Mooo')
      to: 'M$2'
    }, {
      from: 'Foo',
      to: function (matchedWord) {   // callback replacement
        return matchedWord + ' Bar';
      }
    }]
  }
}
```

Here's another example using [grunt.template][grunt.template], and overwriting
original source files:

```javascript
replace: {
  another_example: {
    src: ['build/*.html'],
    overwrite: true,                 // overwrite matched source files
    replacements: [{
      from: /[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}/g,
      to: "<%= grunt.template.today('dd/mm/yyyy') %>"
    }]
  }
}
```



## API reference


### replace

*replace* is the top level task that goes in your `grunt.initConfig({})`. It is
a [multi-task][multitask], meaning that it must contain targets, which you can
name anything you like.

[multitask]: https://github.com/gruntjs/grunt/wiki/Configuring-tasks#task-configuration-and-targets


### src

*src* is an array of source files to be replaced, and is required.
It supports [minimatch][minimatch] paths.

[minimatch]: https://github.com/isaacs/minimatch


### dest

*dest* is the destination for files to be replaced, and can refer to either a:

- file: `'path/output.txt'`
- directory: `'path/'`

grunt-text-replace will throw an error if multiple source files are mapped to
a single file.


### overwrite

*overwrite* should be used for in-place replacement, that is when all you need
to do is overwrite existing files.
To use it, omit *dest*, otherwise
grunt-text-replace will throw an error. You can only use one or the other.


### replacements

*replacements* is an array of *from* and *to* replacements. See the
[examples](#usage) above.


### from

*from* is the old text that you'd like replace. It can be a:

- plain string: `'Red'` *matches all instances of 'Red' in file*
- regular expression object:  `/Red/g` *same as above*


### to

*to* is the replacement. It can be a:

- plain string
- string containing a [grunt.template][grunt.template]
- string containing regex variables `$1`, `$2`, etc
- combination of the above
- function where the return value will be used as the replacement text (supports
[grunt.template][grunt.template])
- any JavaScript object


#### function
Where *to* is a function, the function receives 4 parameters:

1. **matchedWord**:  the matched word
2. **index**:  an integer representing point where word was found in a text
3. **fullText**:  the full original text
4. **regexMatches**:  an array containing all regex matches, empty if none
defined or found.


```javascript
// Where the original source file text is:  "Hello world"

replacements: [{
  from: /wor(ld)/g,
  to: function (matchedWord, index, fullText, regexMatches) {
    // matchedWord:  "world"
    // index:  6
    // fullText:  "Hello world"
    // regexMatches:  ["ld"]
    return 'planet';   //
  }
}]

// The new text will now be:  "Hello planet"
```

#### JavaScript object
Where *to* is a JavaScript object, type coercion will apply as follows:

1. **null**:  will result in an empty string
2. **undefined**:  will return in an empty string
3. **other**:  all other values will use default JavaScript type coercion. Examples:
    - false: 'false'
    - true: 'true'
    - 0: '0'



### options

*options* is an object, specific to a target, and the only supported option is
*processTemplates*

#### processTemplates

*processTemplates* when set to false (by default it is true) switches off
grunt.template processing within function return statements. It doesn't work for
string replacements (ie. when the replacement is a string, not a function), as
grunt processes templates within config string values before they are passed to
the plugin.

```javascript
replace: {
  prevent_templates_example: {
    src: ['text/*.txt'],
    dest: 'build/text/',
    options: {
      processTemplates: false
    },
    replacements: [{
      from: /url\(.*\)/g,
      to: function () {
        return "url(<% Don't process this template, retain the delimeters %>)";
      }
    }]
  }
}
```


[grunt.template]: http://gruntjs.com/api/grunt.template

## Road map
Some changes I'm considering. Happy to receive suggestions for/against:

- **Consolidate function parameters.** This would mean replacing the 4 existing
function parameters 'matchedWord', 'index', 'fullText' and 'regexMatches' with a single
'data' object with 4 members.
- **Source/Destination paths in function callback**. The above change makes it easier to
add the source and destination paths as part of the data parameter in the function callback,
which is a requested feature.
- **Grunt 4.0 'files' and 'options'**. At some point I might move to bringing the plugin
in alignment with the Grunt 4.0 convention of having standard 'files' and 'options' objects.


## Release History
- v0.3.12 - 2014/06/03.  Minor update to docs - fix to a broken link.
- v0.3.11 - 2014/02/09.  Added support for non-string or function 'to' replacements.
- v0.3.10 - 2013/12/02.  Removed test for no source files found, accepting a pull request to do so. It's quite reasonable that you'd specify rewrite rules for files that may, or may not exist. Let me know if removing this is a problem for you.
- v0.3.9 - 2013/10/26.  Copy amends in docs
- v0.3.8 - 2013/09/22.  Minor data checking issue, merged from pull request.
- v0.3.7 - 2013/08/26.  Bumped grunt requirements from 0.4.0 to 0.4.1 due to [changes to path API](http://gruntjs.com/blog/2013-03-13-grunt-0.4.1-released).
- v0.3.6 - 2013/06/21.  Updated links in docs, some of which were pointing to 404 pages.
- v0.3.5 - 2013/06/19.  Minor clean up of docs & package.json. No functional changes since 0.3.1.
- v0.3.1 - 2013/02/18.  Minor feature addition: processTemplates: false to switch off grunt templates in function return statements.
- v0.3.0 - 2013/02/17.  Updated to work in Grunt 4.0. This release is not backwards compatible with grunt 0.3.x.
- v0.2.10 - 2012/12/21.  Minor internal refactor to better support globally installed instances of grunt on some systems.
- v0.2.9 - 2012/11/26.  Fixed issue where overwrite: true was not working where multiple src files were defined.
- v0.2.7 - 2012/11/25.  Fixed issue where replacing a string globally would fail
if regex characters were present in string. This is no longer a problem.
- v0.2.5 - 2012/11/23.  Function replacements now support grunt.template.
- v0.2.0 - 2012/11/21.  Added tests, refactored internals, strings now replace
globally within a file, updated documentation.
- v0.1.0 - 2012/11/12.  Initial release.

Patch releases will generally remain undocumented in this release history.
I'll do so if there's enough reason for it, such as a functionality tweak, or
significant bug fix. For more detail see the source.



## License
Copyright (c) 2013 Jonathan Holmes
Licensed under the MIT license.
