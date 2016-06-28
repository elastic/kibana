# expiry-js

A lightweight Javascript Universal Module for parsing durations.

I developed it as a utility for managing Redis expiries.

## Installation

```
npm install expiry-js
```

```
bower install expiry-js
```

## Usage

```javascript
var
    expiry = require('expiry-js');

var
    example = expiry('1Y1M2W3D5h8m11s19ms'), // or '1Y 1M 2W 3D 5h 8m 11s 19ms'

    year = expiry('1Y'), // or '1 year', '1 years'
    month = expiry('1M'), // or '1 month', '1 months'
    week = expiry('1W'), // or '1 week', '1 weeks'
    day = expiry('1D'), // or '1 day', '1 days'
    hour = expiry('1h'), // or '1 hour', '1 hours'
    minute = expiry('1m'), // or '1 minute', '1 minutes'
    second = expiry('1s'), // or '1 second', '1 seconds'
    milliseconds = expiry('1ms'), // or '1 millisecond', '1 milliseconds'

    altMilliseconds = expiry('1', 'ms');

console.log(day.valueOf()); // 86400000
console.log(day.asMilliseconds()); // 86400000
console.log(day.asSeconds()); // 86400
```

## Change Log

### 0.1.7 (2015-06-20)

* Adds parsing of digits only strings. Thanks, [@BigFunger](https://github.com/BigFunger)

### 0.1.6 (2015-06-18)

* Fixes error parsing seconds. Thanks, [@BigFunger](https://github.com/BigFunger)
