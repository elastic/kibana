Sense
=====

A JSON aware developer's interface to ElasticSearch. Comes with handy machinery such as syntax highlighting, autocomplete,
formatting and code folding.

[![Build Status](https://travis-ci.org/bleskes/sense.png)](https://travis-ci.org/bleskes/sense)

Installation
------------

Sense is installed as a Chrome Extension. Install it from
the [Chrome Webstore](http://bit.ly/es_sense) .

Screenshots
-----------

### Syntax highlighting
![Syntax highlighting](https://github.com/bleskes/sense/raw/master/docs/syntaxhighlighting.png)

### Auto complete
![Auto complete](https://github.com/bleskes/sense/raw/master/docs/autocomplete.png)

### Broken JSON detection
![Broken JSON](https://github.com/bleskes/sense/raw/master/docs/broken.png)

### History
![History](https://github.com/bleskes/sense/raw/master/docs/history.png)

Other goodies
-----

- Keep multiple requests at hand:

  ![Multiple requests](https://github.com/bleskes/sense/raw/master/docs/requestformat.png)
- Copy and paste requests as cURL
- Resizable panels
- Friendly keyboard shortcuts (for a complete list, click the help button):
    * `Ctrl/Cmd + I`         - Auto indent current request.
    * `Ctrl + Space`         - Open Auto complete (even if not typing).
    * `Ctrl/Cmd + Enter`     - Submit request.
    * `Ctrl/Cmd + Shift + C` - Copy request in cURL format.
    * `Ctrl/Cmd + Up/Down`   - Jump to the previous/next request start or end.
    * `Ctrl/Cmd + Alt + L`   - Collapse/expand current scope.

Changes
-------

### v0.8
- Major rewrite to support multiple requests in the editor.
- You can now move the split between editor & output.
- New shortcuts to navigate through requests quickly (see help).
- Improved help popup.
- Added editor support for request with multiple documents, separated by a new line.
- Auto indent now toggels between single line per doc and multi-line formatted & indented.
- Use Tab (as well as Enter) to select autocomplete suggestions.
- Auto complete suggestion now sort prefix matches first.
- Added a welcome message (which will only be shown once)

### v0.7
- Increased history size to 500 elements
- Add mappings to the KB.
- Auto complete menu opens automatically when typing (read help for details on keyboard usage)
- Added the possibility to indicate an endpoint needs one or more indexes to KB (previously had 0 or more).
- GET request ignore editor content and the editor is visually disabled.
- Double a click a history item to select it and close.
- Changed icons to latest ES icons (thanks to @spenceralger)
- Reduced size of method selector (v0.7.9)

### v0.6
- Added support for username passwords in the url.
- Added support for cURL copy & paste.
    - You can now copy current request in curl format (using menu button or a keyboard shortcut)
    - Paste a curl command into the editor and it will be parsed and all the correct fields populated

### v0.5
- Mapping integration - autocomplete on indices, aliases and fields.
- Added facets to the KB.
- Enabled soft wrap in both input and output editors

### v0.4
- Completed knowledge base and autocomplete for Query DSL

### v0.3
- Moved to a Chrome Extension for better deployment and upgrading infrastructure.
- Introduced a knowledge base system to better manage growing size.
- Added an automated test suite.

### v0.2
- History support

### v0.1
- Initial release
