# google-cdn [![Build Status](https://secure.travis-ci.org/passy/google-cdn.png?branch=master)](http://travis-ci.org/passy/google-cdn)

> Grunt task for replacing refs to resources on the [Google CDN](https://developers.google.com/speed/libraries/devguide).

This module makes it easy to replace references to your bower resources in your
app with links to the libraries on the Google CDN.

## Getting started

Install: `npm install --save google-cdn`

### Example

*bower.json*:

```json
{
  "name": "my-awesome-app",
  "dependencies": {
    "jquery": "~2.0.0"
  }
}
```

```javascript
var googlecdn = require('google-cdn');

var bowerConfig = loadJSON('bower.json');
var markup = '<script src="bower_components/jquery/jquery.js"></script>';
var result = googlecdn(markup, bowerConfig);
assert.equal(result,
  '<script src="//ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min.js"></script>');
```

## API

### googlecdn(content, bowerJson[, options])

Replaces references to libraries supported by the Google CDN in `content`.
The library versions are inferred from the `bowerJson`.

`options` is an optional object with these keys:

  - `componentsPath`: defaults to `bower_components`, the path you specify in
    your script tags to the components directory.

## Grunt

You can use this module in grunt through the [grunt-google-cdn](https://github.com/btford/grunt-google-cdn)
plugin, which this module's code is based of.

## License

BSD
