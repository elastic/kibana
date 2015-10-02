Change Log
==========

This file documents all notable changes to PEG.js. The releases follow [semantic
versioning](http://semver.org/).

0.9.0
-----

Released: August 30, 2015

### Major Changes

  * **Tracing support.** Parsers can be compiled with support for tracing their
    progress, which can help debugging complex grammars. This feature is
    experimental and is expected to evolve over time as experience is gained.
    [More details](https://github.com/pegjs/pegjs/commit/da57118a43a904f753d44d407994cf0b36358adc)

  * **Infinite loop detection.** Grammar constructs that could cause infinite
    loops in generated parsers are detected during compilation and cause errors.

  * **Improved location information API.** The `line`, `column`, and `offset`
    functions available in parser code were replaced by a single `location`
    function which returns an object describing the current location. Similarly,
    the `line`, `column`, and `offset` properties of exceptions were replaced by
    a single `location` property. The location is no longer a single point but a
    character range, which is meaningful mainly in actions where the range
    covers action’s expression.
    [More details](https://github.com/pegjs/pegjs/compare/e75f21dc8f0e66b3d87c4c19b3fcb8f89d9c3acd...eaca5f0acf97b66ef141fed84aa95d4e72e33757)

  * **Improved error reporting.** All exceptions thrown when generating a parser
    have associated location information. And all exceptions thrown by generated
    parser and PEG.js itself have a stack trace (the `stack` property) in
    environments that support `Error.captureStackTrace`.

  * **Strict mode code**. All PEG.js and generated parser code is written using
    [JavaScript strict mode](https://developer.mozilla.org/cs/docs/Web/JavaScript/Reference/Strict_mode).

### Minor Changes

  * Labels behave like block-scoped variables. This means parser code can see
    labels defined outside expressions containing code.

  * Empty sequences are no longer allowed.

  * Label names can’t be JavaScript reserved words.

  * Rule and label names can contain Unicode characters like in JavaScript.

  * Rules have to be separated either by `;` or a newline (until now, any
    whitespace was enough).

  * The PEG.js grammar and all the example grammars were completely rewritten.
    This rewrite included a number of cleanups, formatting changes, naming
    changes, and bug fixes.

  * The parser object can now be accessed as `parser` in parser code.

  * Location information computation is faster.

  * Added support for Node.js >= 0.10.x, io.js, and Edge. Removed support for
    Node.js < 0.10.x.

### Bug Fixes

  * Fixed left recursion detector which missed many cases.

  * Fixed escaping of U+0100—U+107F and U+1000—U+107F in generated code and
    error messages.

  * Renamed `parse` and `SyntaxError` to `peg$parse` and `peg$SyntaxError` to
    mark them as internal identifiers.

[Complete set of changes](https://github.com/pegjs/pegjs/compare/v0.8.0...v0.9.0)

0.8.0
-----

Released: December 24, 2013

### Big Changes

  * Completely rewrote the code generator. Among other things, it allows
    optimizing generated parsers for parsing speed or code size using the
    `optimize` option of the `PEG.buildParser` method or the `--optimize`/`-o`
    option on the command-line. All internal identifiers in generated code now
    also have a `peg$` prefix to discourage their use and avoid conflicts.
    [[#35](https://github.com/dmajda/pegjs/issues/35),
    [#92](https://github.com/dmajda/pegjs/issues/92)]

  * Completely redesigned error handling. Instead of returning `null` inside
    actions to indicate match failure, new `expected` and `error` functions can
    be called to trigger an error. Also, expectation inside the `SyntaxError`
    exceptions are now structured to allow easier machine processing.
    [[#198](https://github.com/dmajda/pegjs/issues/198)]

  * Implemented a plugin API. The list of plugins to use can be specified using
    the `plugins` option of the `PEG.buildParser` method or the `--plugin`
    option on the command-line. Also implemented the `--extra-options` and
    `--extra-options-file` command-line options, which are mainly useful to pass
    additional options to plugins.
    [[#106](https://github.com/dmajda/pegjs/issues/106)]

  * Made `offset`, `line` and `column` functions, not variables. They are now
    available in all parsers and return lazily-computed position data. Removed
    now useless `trackLineAndColumn` option of the `PEG.buildParser` method and
    the `--track-line-and-column` option on the command-line.

  * Added a new `text` function. When called inside an action, it returns the
    text matched by action's expression.
    [[#131](https://github.com/dmajda/pegjs/issues/131)]

  * Added a new `$` operator. It extracts matched strings from expressions.

  * The `?` operator now returns `null` on unsuccessful match.

  * Predicates now always return `undefined`.

  * Replaced the `startRule` parameter of the `parse` method in generated
    parsers with more generic `options` parameter. The start rule can now be
    specified as the `startRule` option. The `options` parameter can be also
    used to pass custom options to the parser because it is visible as the
    `options` variable inside parser code.
    [[#37](https://github.com/dmajda/pegjs/issues/37)]

  * The list of allowed start rules of a generated parser now has to be
    specified explicitly using the `allowedStartRules` option of the
    `PEG.buildParser` method or the `--allowed-start-rule` option on the
    command-line. This will make certain optimizations like rule inlining easier
    in the future.

  * Removed the `toSource` method of generated parsers and introduced a new
    `output` option of the `PEG.buildParser` method. It allows callers to
    specify whether they want to get back the parser object or its source code.

  * The source code is now a valid npm package. This makes using development
    versions easier.
    [[#32](https://github.com/dmajda/pegjs/issues/32)]

  * Generated parsers are now ~25% faster and ~62%/~3% smaller (when optimized
    for size/speed) than those generated by 0.7.0.

  * Requires Node.js 0.8.0+.

### Small Changes

  * `bin/pegjs` now outputs just the parser source if the value of the
    `--export-var` option is empty. This makes embedding generated parsers into
    other files easier.
    [[#143](https://github.com/dmajda/pegjs/issues/143)]

  * Changed the value of the `name` property of `PEG.GrammarError` instances
    from “PEG.GrammarError” to just “GrammarError”. This better reflects the
    fact that PEG.js can get required with different variable name than `PEG`.

  * Setup prototype chain for `PEG.GrammarError` correctly.

  * Setup prototype chain for `SyntaxError` in generated parsers correctly.

  * Fixed error messages in certain cases with trailing input
    [[#119](https://github.com/dmajda/pegjs/issues/119)]

  * Fixed code generated for classes starting with `\^`.
    [[#125](https://github.com/dmajda/pegjs/issues/125)]

  * Fixed too eager proxy rules removal.
    [[#137](https://github.com/dmajda/pegjs/issues/137)]

  * Added a license to all vendored libraries.
    [[#207](https://github.com/dmajda/pegjs/issues/207)]

  * Converted the test suite from QUnit to Jasmine, cleaning it up on the way.

  * Travis CI integration.

  * Various internal code improvements and fixes.

  * Various generated code improvements and fixes.

  * Various example grammar improvements and fixes.

  * Improved `README.md`.

  * Converted `CHANGELOG` to Markdown.

0.7.0
-----

Released: April 18, 2012

### Big Changes

  * Added ability to pass options to `PEG.buildParser`.

  * Implemented the `trackLineAndColumn` option for `PEG.buildParser` (together
    with the `--track-line-and-column` command-line option). It makes the
    generated parser track line and column during parsing. These are made
    available inside actions and predicates as `line` and `column` variables.

  * Implemented the `cache` option for `PEG.buildParser` (together with the
    `--cache` command-line option). This option enables/disables the results
    cache in generated parsers, resulting in dramatic speedup when the cache is
    disabled (the default now). The cost is breaking the linear parsing time
    guarantee.

  * The current parse position is visible inside actions and predicates as the
    `offset` variable.

  * Exceptions thrown by the parser have `offset`, `expected` and `found`
    properties containing machine-readable information about the parse failure
    (based on a patch by Marcin Stefaniuk).

  * Semantic predicates have access to preceding labels.
    [[GH-69](https://github.com/dmajda/pegjs/issues/69)]

  * Implemented case-insensitive literal and class matching.
    [[GH-34](https://github.com/dmajda/pegjs/issues/34)]

  * Rewrote the code generator — split some computations into separate passes
    and based it on a proper templating system (Codie).

  * Rewrote variable handling in generated parsers in a stack-like fashion,
    simplifying the code and making the parsers smaller and faster.

  * Adapted to Node.js 0.6.6+ (no longer supported in older versions).

  * Dropped support for IE < 8.

  * As a result of several optimizations, parsers generated by 0.7.0 are ~6.4
    times faster and ~19% smaller than those generated by 0.6.2 (as reported by
    `/tools/impact`).

### Small Changes

  * Fixed reported error position when part of the input is not consumed.
    [[GH-48](https://github.com/dmajda/pegjs/issues/48)]

  * Fixed incorrect disjunction operator in `computeErrorPosition` (original
    patch by Wolfgang Kluge).

  * Fixed regexp for detecting command-line options in `/bin/pegjs`.
    [[GH-51](https://github.com/dmajda/pegjs/issues/51)]

  * Generate more efficient code for empty literals (original patch by Wolfgang
    Kluge).

  * Fixed comment typos (patches by Wolfgang Kluge and Jason Davies).
    [[GH-59](https://github.com/dmajda/pegjs/issues/59)]

  * Fixed a typo in JavaScript example grammar.
    [[GH-62](https://github.com/dmajda/pegjs/issues/62)]

  * Made copy & paste inclusion of the PEG.js library into another code easier
    by changing how the library is exported.

  * Improved the copyright comment and the “Generated by...” header.

  * Replaced `Jakefile` with `Makefile`.

  * Added `make hint` task that checks all JavaScript files using JSHint and
    resolved all issues it reported. All JavaScript files and also generated
    parsers are JSHint-clean now.

  * Fixed output printed during test failures (expected value was being printed
    instead of the actual one). Original patch by Wolfgang Kluge.

  * Added a `/tools/impact` script to measure speed and size impact of commits.

  * Various generated code improvements and fixes.

  * Various internal code improvements and fixes.

  * Improved `README.md`.

0.6.2
-----

Released: August 20, 2011

### Small Changes

  * Reset parser position when action returns `null`.

  * Fixed typo in JavaScript example grammar.

0.6.1
-----

Released: April 14, 2011

### Small Changes

  * Use `--ascii` option when generating a minified version.

0.6.0
-----

Released: April 14, 2011

### Big Changes

  * Rewrote the command-line mode to be based on Node.js instead of Rhino — no
    more Java dependency. This also means that PEG.js is available as a Node.js
    package and can be required as a module.

  * Version for the browser is built separately from the command-line one in two
    flavors (normal and minified).

  * Parser variable name is no longer required argument of `bin/pegjs` — it is
    `module.exports` by default and can be set using the `-e`/`--export-var`
    option. This makes parsers generated by `/bin/pegjs` Node.js modules by
    default.

  * Added ability to start parsing from any grammar rule.

  * Added several compiler optimizations — 0.6 is ~12% faster than 0.5.1 in the
    benchmark on V8.

### Small Changes

  * Split the source code into multiple files combined together using a build
    system.

  * Jake is now used instead of Rake for build scripts — no more Ruby
    dependency.

  * Test suite can be run from the command-line.

  * Benchmark suite can be run from the command-line.

  * Benchmark browser runner improvements (users can specify number of runs,
    benchmarks are run using `setTimeout`, table is centered and fixed-width).

  * Added PEG.js version to “Generated by...” line in generated parsers.

  * Added PEG.js version information and homepage header to `peg.js`.

  * Generated code improvements and fixes.

  * Internal code improvements and fixes.

  * Rewrote `README.md`.

0.5.1
-----

Released: November 28, 2010

### Small Changes

  * Fixed a problem where “SyntaxError: Invalid range in character class.” error
    appeared when using command-line version on Widnows
    ([GH-13](https://github.com/dmajda/pegjs/issues/13)).

  * Fixed wrong version reported by `bin/pegjs --version`.

  * Removed two unused variables in the code.

  * Fixed incorrect variable name on two places.

0.5
---

Released: June 10, 2010

### Big Changes

  * Syntax change: Use labeled expressions and variables instead of `$1`, `$2`,
    etc.

  * Syntax change: Replaced `:` after a rule name with `=`.

  * Syntax change: Allow trailing semicolon (`;`) for rules

  * Semantic change: Start rule of the grammar is now implicitly its first rule.

  * Implemented semantic predicates.

  * Implemented initializers.

  * Removed ability to change the start rule when generating the parser.

  * Added several compiler optimizations — 0.5 is ~11% faster than 0.4 in the
    benchmark on V8.

### Small Changes

  * `PEG.buildParser` now accepts grammars only in string format.

  * Added “Generated by ...” message to the generated parsers.

  * Formatted all grammars more consistently and transparently.

  * Added notes about ECMA-262, 5th ed. compatibility to the JSON example
    grammar.

  * Guarded against redefinition of `undefined`.

  * Made `bin/pegjs` work when called via a symlink
    ([issue #1](https://github.com/dmajda/pegjs/issues/1)).

  * Fixed bug causing incorrect error messages
    ([issue #2](https://github.com/dmajda/pegjs/issues/2)).

  * Fixed error message for invalid character range.

  * Fixed string literal parsing in the JavaScript grammar.

  * Generated code improvements and fixes.

  * Internal code improvements and fixes.

  * Improved `README.md`.

0.4
---

Released: April 17, 2010

### Big Changes

  * Improved IE compatibility — IE6+ is now fully supported.

  * Generated parsers are now standalone (no runtime is required).

  * Added example grammars for JavaScript, CSS and JSON.

  * Added a benchmark suite.

  * Implemented negative character classes (e.g. `[^a-z]`).

  * Project moved from BitBucket to GitHub.

### Small Changes

  * Code generated for the character classes is now regexp-based (= simpler and
    more scalable).

  * Added `\uFEFF` (BOM) to the definition of whitespace in the metagrammar.

  * When building a parser, left-recursive rules (both direct and indirect) are
    reported as errors.

  * When building a parser, missing rules are reported as errors.

  * Expected items in the error messages do not contain duplicates and they are
    sorted.

  * Fixed several bugs in the example arithmetics grammar.

  * Converted `README` to GitHub Flavored Markdown and improved it.

  * Added `CHANGELOG`.

  * Internal code improvements.

0.3
---

Released: March 14, 2010

  * Wrote `README`.

  * Bootstrapped the grammar parser.

  * Metagrammar recognizes JavaScript-like comments.

  * Changed standard grammar extension from `.peg` to `.pegjs` (it is more
    specific).

  * Simplified the example arithmetics grammar + added comment.

  * Fixed a bug with reporting of invalid ranges such as `[b-a]` in the
    metagrammar.

  * Fixed `--start` vs. `--start-rule` inconsistency between help and actual
    option processing code.

  * Avoided ugliness in QUnit output.

  * Fixed typo in help: `parserVar` → `parser_var`.

  * Internal code improvements.

0.2.1
-----

Released: March 8, 2010

  * Added `pegjs-` prefix to the name of the minified runtime file.

0.2
---

Released: March 8, 2010

  * Added `Rakefile` that builds minified runtime using Google Closure Compiler
    API.

  * Removed trailing commas in object initializers (Google Closure does not like
    them).

0.1
---

Released: March 8, 2010

  * Initial release.
