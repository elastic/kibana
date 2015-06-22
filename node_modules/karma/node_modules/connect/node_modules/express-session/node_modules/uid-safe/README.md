
# UID Safe

Create cryptographically secure UIDs safe for both cookie and URL usage.
This is in contrast to modules such as [rand-token](https://github.com/sehrope/node-rand-token)
and [uid2](https://github.com/coreh/uid2) whose UIDs are actually skewed
due to the use of `%` and unnecessarily truncate the UID.
Use this if you could still use UIDs with `-` and `_` in them.

## API

```js
var uid = require('uid-safe')
```

### uid(byteLength, [cb])

Asynchronously create a UID with a specific byte length.
Because `base64` encoding is used underneath, this is not the string length!
For example, to create a UID of length 24, you want a byte length of 18!

If `cb` is not defined, a promise is returned.
However, to use promises, you must either install [bluebird](https://github.com/petkaantonov/bluebird)
or use a version of node.js that has native promises,
otherwise your process will crash and die.

```js
uid(18).then(function (string) {
  // do something with the string
})

uid(18, function (err, string) {
  if (err) throw err
  // do something with the string
})
```

### uid.sync(byteLength)

A synchronous version of above.

```js
var string = uid.sync(18)
```
