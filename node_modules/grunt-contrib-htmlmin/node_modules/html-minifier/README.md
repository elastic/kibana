[![NPM version](https://badge.fury.io/js/html-minifier.png)](http://badge.fury.io/js/html-minifier)
[![Build Status](https://travis-ci.org/kangax/html-minifier.png)](https://travis-ci.org/kangax/html-minifier)
[![devDependency Status](https://david-dm.org/kangax/html-minifier/dev-status.png?theme=shields.io)](https://david-dm.org/kangax/html-minifier#info=devDependencies)

[HTMLMinifier](http://kangax.github.io/html-minifier/) is a highly __configurable__, __well-tested__, Javascript-based HTML minifier, with lint-like capabilities.

See [corresponding blog post](http://perfectionkills.com/experimenting-with-html-minifier/) for all the gory details of [how it works](http://perfectionkills.com/experimenting-with-html-minifier/#how_it_works), [description of each option](http://perfectionkills.com/experimenting-with-html-minifier/#options), [testing results](http://perfectionkills.com/experimenting-with-html-minifier/#field_testing) and [conclusions](http://perfectionkills.com/experimenting-with-html-minifier/#cost_and_benefits).

[Test suite is available online](http://kangax.github.io/html-minifier/tests/).

Also see corresponding [Grunt plugin](https://github.com/gruntjs/grunt-contrib-htmlmin).

How does HTMLMinifier compare to [another solution](http://www.willpeavy.com/minifier/) — HTML Minifier from Will Peavy (1st result in [google search for "html minifier"](https://www.google.com/#q=html+minifier))?

| Site          | Original size _(KB)_ | HTMLMinifier _(KB)_  | Will Peavy _(KB)_  |
| ------------- |:-------------:| -------------:| -----------:|
| [Wikipedia](http://en.wikipedia.org/wiki/President_of_the_United_States)     | 401.4       | <b>385.5</b>       |   396.3   |
| [Stackoverflow](http://stackoverflow.com) | 200.4       | <b>165.3</b>       |   168.3   |
| [Amazon](http://amazon.com)        | 245.9       | 237.1       |   <b>225</b>     |
| [ES6 table](http://kangax.github.io/es5-compat-table/es6/)     | 117.9       | <b>82</b>          |   92      |
| [HTMLMinifier page](https://github.com/kangax/html-minifier)     | 48.8       | <b>41.3</b>          |   43.3      |


Installing with [npm](https://github.com/isaacs/npm):

```
npm install html-minifier
```


## Options Quick Reference

| Option                         | Description                                                                                                                                                 | Default |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `removeComments`               | [Strip HTML comments](http://perfectionkills.com/experimenting-with-html-minifier/#remove_comments)                                                         | `false` |
| `removeCommentsFromCDATA`      | [Strip HTML comments from scripts and styles](http://perfectionkills.com/experimenting-with-html-minifier/#remove_comments_from_scripts_and_styles)         | `false` |
| `removeCDATASectionsFromCDATA` | [Remove CDATA sections from script and style elements](http://perfectionkills.com/experimenting-with-html-minifier/#remove_cdata_sections)                  | `false` |
| `collapseWhitespace`           | [Collapse white space that contributes to text nodes in a document tree.](http://perfectionkills.com/experimenting-with-html-minifier/#collapse_whitespace) | `false` |
| `collapseBooleanAttributes`    | [Omit attribute values from boolean attributes](http://perfectionkills.com/experimenting-with-html-minifier/#collapse_boolean_attributes)                   | `false` |
| `removeAttributeQuotes`        | [Remove quotes around attributes when possible.](http://perfectionkills.com/experimenting-with-html-minifier/#remove_attribute_quotes)                      | `false` |
| `removeRedundantAttributes`    | [Remove attributes when value matches default.](http://perfectionkills.com/experimenting-with-html-minifier/#remove_redundant_attributes)                   | `false` |
| `useShortDoctype`              | [Replaces the doctype with the short (HTML5) doctype](http://perfectionkills.com/experimenting-with-html-minifier/#use_short_doctype)                       | `false` |
| `removeEmptyAttributes`        | [Remove all attributes with whitespace-only values](http://perfectionkills.com/experimenting-with-html-minifier/#remove_empty_or_blank_attributes)          | `false` |
| `removeOptionalTags`           | [Remove unrequired tags](http://perfectionkills.com/experimenting-with-html-minifier/#remove_optional_tags)                                                 | `false` |
| `removeEmptyElements`          | [Remove all elements with empty contents](http://perfectionkills.com/experimenting-with-html-minifier/#remove_empty_elements)                               | `false` |
| `lint`                         | [Toggle linting](http://perfectionkills.com/experimenting-with-html-minifier/#validate_input_through_html_lint)                                             | `false` |


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/kangax/html-minifier/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
