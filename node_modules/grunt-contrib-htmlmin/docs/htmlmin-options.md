# Options

See the [html-minifier docs](http://perfectionkills.com/experimenting-with-html-minifier/#options) for more in-depth explanation of the options and caveats.

## removeComments

Type: `Boolean`  
Default: `false`

Strip HTML comments.

## removeCommentsFromCDATA

Type: `Boolean`  
Default: `false`

Remove HTML comments from inside `<script>` and `<style>`.

## removeCDATASectionsFromCDATA

Type: `Boolean`  
Default: `false`

Remove CDATA sections from inside `<script>` and `<style>`.

## collapseWhitespace

Type: `Boolean`  
Default: `false`

Collapse white space that contributes to text nodes in a document tree.

It doesn't affect significant white space; e.g. in contents of elements like SCRIPT, STYLE, PRE or TEXTAREA.

`<div> <p>    foo </p>    </div>` => `<div><p>foo</p></div>`

## collapseBooleanAttributes

Type: `Boolean`  
Default: `false`

Collapse boolean attributes.

`<input disabled="disabled">` => `<input disabled>`

## removeAttributeQuotes

Type: `Boolean`  
Default: `false`

Remove attribute quotes when it's safe to do so.

`<p id="foo">` => `<p id=foo>`

## removeRedundantAttributes

Type: `Boolean`  
Default: `false`

Remove redundant attributes like `type="text/javascript"`.

## useShortDoctype

Type: `Boolean`  
Default: `false`

Replace doctype with the short HTML5 version `<!DOCTYPE html>`.

## removeEmptyAttributes

Type: `Boolean`  
Default: `false`

Remove empty (or blank) attributes.

## removeOptionalTags

Type: `Boolean`  
Default: `false`

Some elements are allowed to have their tags omitted, like `</td>`.

## removeEmptyElements

Type: `Boolean`  
Default: `false`

Remove empty elements.

*Experimental*
