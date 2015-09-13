# postcss-pseudoelements

## usage

```javascript
var pe = require('postcss-pseudoelements');
var postcss = require('postcss');

var processor = postcss(pe(OPTIONS));

console.log(processor.process('a:before {}').css) // outputs: a:before {}
console.log(processor.process('a::before {}').css) // outputs: a:before {}
```

## options

`selectors`: Array of pseudo-element selectors to rewrite with single and double colons. Note that these values will be used in a regexp without escaping. Defaults to `['before','after','first-letter','first-line']`
