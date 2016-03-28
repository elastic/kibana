# good-squeeze

Simple transform streams useful in creating [good](https://github.com/hapijs/good) data pipelines.

[![Build Status](https://travis-ci.org/hapijs/good-squeeze.svg?branch=master&style=flat)](https://travis-ci.org/hapijs/good-squeeze)
![Current Version](https://img.shields.io/npm/v/good-squeeze.svg?style=flat)

Lead Maintainer: [Adam Bretz](https://github.com/arb)

## Usage

good-squeeze is a collection of small transform streams useful in custom good reporter clients. The `Squeeze` stream is useful for filtering events based on the good event options. The `SafeJson` stream is useful for stringifying objects to prevent circular object errors.

## Methods

### `Squeeze(events, [options])`

Creates a new Squeeze transform stream where:

- `events` an object where each key is a valid good event, and the value is a string or array of strings representing event tags. "\*" indicates no filtering. `null` and `undefined` are assumed to be "\*".
- `options` an optional configuration object that gets passed to the Node [`Stream.Transform`](http://nodejs.org/api/stream.html#stream_class_stream_transform) constructor. **Note** `objectMode` is always `true` for all `Squeeze` objects.

The transform stream only passes on events that satisfy the event filtering based on event name and tags. If the upstream event doesn't satisfy the filter, it is not continued down the pipe line.

### `Squeeze.subscription(events)`

A static method on `Squeeze` that creates a new event subscription map where:

- `events` an object where each key is a valid good event, and the value is a string or array of strings representing event tags. "*" indicates no filtering. `null` and `undefined` are assumed to be "*".

```js
var Squeeze = require('good-squeeze');

Squeeze.subscription({ log: 'user', ops: '*', request: ['hapi', 'foo'] });

// Results in
// {
//     log: [ 'user' ],
//     ops: [],
//     request: [ 'hapi', 'foo', 'hapi', 'foo' ]
// }
```

Useful for creating an event subscription to be used with `Squeeze.filter` if you do not plan on creating a pipeline coming from good and instead want to manage event filtering manually.


### `Squeeze.filter(subscription, data)`

Returns `true` if the supplied `data.event` + `data.tags` should be reported based on `subscription` where:

- `subscription` - a subscription map created by `Squeeze.subscription()`.
- `data` - event object emitted from good/hapi which should contain the following keys:
    - `event` - a string representing the event name of `data`
    - `tags` - an array of strings representing tags associated with this event.

### `SafeJson([options])`

Creates a new SafeJson transform stream where:

- `options` an optional configuration object that gets passed to the Node [`Stream.Transform`](http://nodejs.org/api/stream.html#stream_class_stream_transform) constructor. **Note** `objectMode` is always `true` for all `Squeeze` objects.

The transform stream stringifys the incoming data and pipes it forward. It will not crash in the cases of circular references and will instead include a "~Circular" string in the result.
