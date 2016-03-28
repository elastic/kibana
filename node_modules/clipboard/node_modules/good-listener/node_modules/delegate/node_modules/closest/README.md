# Closest

Similar to jQuery's `$.fn.closest` and `$.fn.parents`.
Finds the closest parent that matches a selector.

## Installation

    $ npm install closest

## API

### `closest(element, selector, checkSelf)`

* element - will check this elements parents
* selector - CSS selector to match parents
* checkSelf - check `element`.
  If falsey, will begin with `element.parentNode` and is synonymous to `$.fn.parents`.
  Otherwise, it's `$.fn.closest`.

Example:

```javascript
var closest = require('cosest');

closest(document.body, 'html') === document.documentElement
closest(document.body, 'body', true) === document.body
closest(document.documentElement, 'html') == null
```

## License

  MIT
