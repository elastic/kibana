# date-time [![Build Status](https://travis-ci.org/sindresorhus/date-time.png?branch=master)](http://travis-ci.org/sindresorhus/date-time)

> Pretty UTC datetime: `2014-01-09 06:46:01 UTC`


## Install

Install with [npm](https://npmjs.org/package/date-time)

```
npm install --save date-time
```


## Example

```js
var dateTime = require('date-time');

dateTime();
//=> 2014-01-09 06:46:01 UTC

dateTime(new Date(2050, 1, 2));
//=> 2050-02-01 23:00:00 UTC
```

## API

### dateTime(date)

#### date

Type: `Date`  
Default: `new Date()`


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
