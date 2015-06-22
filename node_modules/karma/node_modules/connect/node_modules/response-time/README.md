# response-time

[![NPM version](https://badge.fury.io/js/response-time.svg)](https://badge.fury.io/js/response-time)
[![Build Status](https://travis-ci.org/expressjs/response-time.svg?branch=master)](https://travis-ci.org/expressjs/response-time)
[![Coverage Status](https://img.shields.io/coveralls/expressjs/response-time.svg)](https://coveralls.io/r/expressjs/response-time)

Response time middleware extracted from connect.

## Installation

```sh
$ npm install response-time
```

## API

```js
var responseTime = require('response-time')

// time starts ticking from the moment req goes through the middleware
app.use(responseTime(5))
```

### responseTime(digits)

Returns middleware that adds a `X-Response-Time` header to responses.

- `digits` - the fixed number of digits to include. (default: `3`)

## License

[MIT](LICENSE)
