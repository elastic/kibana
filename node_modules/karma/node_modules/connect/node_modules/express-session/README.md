# express-session

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

## Installation

```bash
$ npm install express-session
```

## API

```js
var express = require('express')
var session = require('express-session')

var app = express()

app.use(session({secret: 'keyboard cat'}))
```


### session(options)

Setup session store with the given `options`.

Session data is _not_ saved in the cookie itself, just the session ID.

#### Options

  - `name` - cookie name (formerly known as `key`). (default: `'connect.sid'`)
  - `store` - session store instance.
  - `secret` - session cookie is signed with this secret to prevent tampering.
  - `cookie` - session cookie settings.
    - (default: `{ path: '/', httpOnly: true, secure: false, maxAge: null }`)
  - `genid` - function to call to generate a new session ID. (default: uses `uid2` library)
  - `rolling` - forces a cookie set on every response. This resets the expiration date. (default: `false`)
  - `resave` - forces session to be saved even when unmodified. (default: `true`)
  - `proxy` - trust the reverse proxy when setting secure cookies (via "x-forwarded-proto" header). When set to `true`, the "x-forwarded-proto" header will be used. When set to `false`, all headers are ignored. When left unset, will use the "trust proxy" setting from express. (default: `undefined`)
  - `saveUninitialized` - forces a session that is "uninitialized" to be saved to the store. A session is uninitialized when it is new but not modified. This is useful for implementing login sessions, reducing server storage usage, or complying with laws that require permission before setting a cookie. (default: `true`)
  - `unset` - controls result of unsetting `req.session` (through `delete`, setting to `null`, etc.). This can be "keep" to keep the session in the store but ignore modifications or "destroy" to destroy the stored session. (default: `'keep'`)

#### options.genid

Generate a custom session ID for new sessions. Provide a function that returns a string that will be used as a session ID. The function is given `req` as the first argument if you want to use some value attached to `req` when generating the ID.

**NOTE** be careful you generate unique IDs so your sessions do not conflict.

```js
app.use(session({
  genid: function(req) {
    return genuuid(); // use UUIDs for session IDs
  },
  secret: 'keyboard cat'
}))
```

#### Cookie options

Please note that `secure: true` is a **recommended** option. However, it requires an https-enabled website, i.e., HTTPS is necessary for secure cookies.
If `secure` is set, and you access your site over HTTP, the cookie will not be set. If you have your node.js behind a proxy and are using `secure: true`, you need to set "trust proxy" in express:

```js
var app = express()
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  cookie: { secure: true }
}))
```

For using secure cookies in production, but allowing for testing in development, the following is an example of enabling this setup based on `NODE_ENV` in express:

```js
var app = express()
var sess = {
  secret: 'keyboard cat',
  cookie: {}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))
```

By default `cookie.maxAge` is `null`, meaning no "expires" parameter is set
so the cookie becomes a browser-session cookie. When the user closes the
browser the cookie (and session) will be removed.

### req.session

To store or access session data, simply use the request property `req.session`,
which is (generally) serialized as JSON by the store, so nested objects
are typically fine. For example below is a user-specific view counter:

```js
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))

app.use(function(req, res, next) {
  var sess = req.session
  if (sess.views) {
    sess.views++
    res.setHeader('Content-Type', 'text/html')
    res.write('<p>views: ' + sess.views + '</p>')
    res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>')
    res.end()
  } else {
    sess.views = 1
    res.end('welcome to the session demo. refresh!')
  }
})
```

#### Session.regenerate()

To regenerate the session simply invoke the method, once complete
a new SID and `Session` instance will be initialized at `req.session`.

```js
req.session.regenerate(function(err) {
  // will have a new session here
})
```

#### Session.destroy()

Destroys the session, removing `req.session`, will be re-generated next request.

```js
req.session.destroy(function(err) {
  // cannot access session here
})
```

#### Session.reload()

Reloads the session data.

```js
req.session.reload(function(err) {
  // session updated
})
```

#### Session.save()

```js
req.session.save(function(err) {
  // session saved
})
```

#### Session.touch()

Updates the `.maxAge` property. Typically this is
not necessary to call, as the session middleware does this for you.

### req.session.cookie

Each session has a unique cookie object accompany it. This allows
you to alter the session cookie per visitor. For example we can
set `req.session.cookie.expires` to `false` to enable the cookie
to remain for only the duration of the user-agent.

#### Cookie.maxAge

Alternatively `req.session.cookie.maxAge` will return the time
remaining in milliseconds, which we may also re-assign a new value
to adjust the `.expires` property appropriately. The following
are essentially equivalent

```js
var hour = 3600000
req.session.cookie.expires = new Date(Date.now() + hour)
req.session.cookie.maxAge = hour
```

For example when `maxAge` is set to `60000` (one minute), and 30 seconds
has elapsed it will return `30000` until the current request has completed,
at which time `req.session.touch()` is called to reset `req.session.maxAge`
to its original value.

```js
req.session.cookie.maxAge // => 30000
```

## Session Store Implementation

Every session store _must_ implement the following methods

   - `.get(sid, callback)`
   - `.set(sid, session, callback)`
   - `.destroy(sid, callback)`

Recommended methods include, but are not limited to:

   - `.length(callback)`
   - `.clear(callback)`

For an example implementation view the [connect-redis](http://github.com/visionmedia/connect-redis) repo.

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/express-session.svg?style=flat
[npm-url]: https://npmjs.org/package/express-session
[travis-image]: https://img.shields.io/travis/expressjs/session.svg?style=flat
[travis-url]: https://travis-ci.org/expressjs/session
[coveralls-image]: https://img.shields.io/coveralls/expressjs/session.svg?style=flat
[coveralls-url]: https://coveralls.io/r/expressjs/session?branch=master
[downloads-image]: https://img.shields.io/npm/dm/express-session.svg?style=flat
[downloads-url]: https://npmjs.org/package/express-session
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg?style=flat
[gratipay-url]: https://gratipay.com/dougwilson/
