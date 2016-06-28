![iron](https://raw.github.com/hueniverse/iron/master/images/iron.png)

<img align="right" src="https://raw.github.com/hueniverse/iron/master/images/logo.png" /> **iron** is a cryptographic
utility for sealing a JSON object using symmetric key encryption with message integrity verification. Or in other words,
it lets you encrypt an object, send it around (in cookies, authentication credentials, etc.), then receive it back and
decrypt it. The algorithm ensures that the message was not tempered with, and also provides a simple mechanism for
password rotation.

Current version: **2.x**

Note: 2.x is the same exact protocol as 1.x (the version increment reflected a change in
the internal error format used by the module and by the node API).

[![Build Status](https://secure.travis-ci.org/hueniverse/iron.png)](http://travis-ci.org/hueniverse/iron)


# Table of Content

- [**Introduction**](#introduction)
<p></p>
- [Usage](#usage)
  - [Options](#options)
<p></p>
- [**Security Considerations**](#security-considerations)
  - [Plaintext Storage of Credentials](#plaintext-storage-of-credentials)
<p></p>
- [**Frequently Asked Questions**](#frequently-asked-questions)
<p></p>
- [**Acknowledgements**](#acknowledgements)

# Introduction

**iron** provides methods for encrypting an object, generating a message authentication code (MAC), and serializing both
into a cookie / URI / HTTP header friendly format. Sealed objects are useful in cases where state has to reside on other
applications not under your control, without exposing the details of this state to those application.

For example, sealed objects allow you to encrypt the permissions granted to the authenticated user, store those permissions
using a cookie, without worrying about someone modifying (or even knowing) what those permissions are. Any modification to
the encrypted data will invalidate its integrity.

The seal process follows these general steps:

- generate encryption salt `saltE`
- derive an encryption key `keyE` using `saltE` and a password
- generate an integrity salt `saltI`
- derive an integrity (HMAC) key `keyI` using `saltI`
- generate a random [initialization vector](http://en.wikipedia.org/wiki/Initialization_vector) `iv`
- encrypt the serialized object string using `keyE` and `iv`
- mac the encrypted object along with `saltE` and `iv`
- concatenate `saltE`, `saltI`, `iv`, and the encrypted object into a URI-friendly string


# Usage

To seal an object:

```javascript
var obj = {
    a: 1,
    b: 2,
    c: [3, 4, 5],
    d: {
        e: 'f'
    }
};

var password = 'some_not_random_password';

Iron.seal(obj, password, Iron.defaults, function (err, sealed) {

    console.log(sealed);
});
```

The result `sealed` object is a string which can be sent via cookies, URI query parameter, or an HTTP header attribute.
To unseal the string:

```javascript
Iron.unseal(sealed, password, Iron.defaults, function (err, unsealed) {

    // unsealed has the same content as obj
});
```

### Options

**iron** provides a few options for customizing the key deriviation algorithm used to generate encryption and integrity
verification keys as well as the algorithms and salt sizes used. The _'seal()'_ and _'unseal()'_ methods take an options
object with the following **required** keys:

- `encryption` - defines the options used by the encryption process.
- `integrity` - defines the options used by the HMAC itegrity verification process.

Each of these option objects includes the following **required** keys:

- `saltBits` - the size of the salt (random buffer used to ensure that two identical objects will generate a different encrypted result.
- `algorithm` - the algorithm used ('aes-256-cbc' for encryption and 'sha256' for integrity are the only two supported at this time).
- `iterations` - the number of iterations used to derive a key from the password. Set to `1` by default. The number of ideal iterations
  to use is dependent on your application's performance requirements. More iterations means it takes longer to generate the key.3

The _'seal()'_ and _'unseal()'_ methods also take the following **optional** options keys:

- `ttl` - sealed object lifetime in milliseconds where 0 means forever. Defaults to 0.
- `timestampSkewSec` - number of seconds of permitted clock skew for incoming expirations. Defaults to 60 seconds.
- `localtimeOffsetMsec` - local clock time offset express in a number of milliseconds (positive or negative). Defaults to 0.

**iron** includes a default options object which can be passed to the methods as shown above in the example. The default
settings are:

```javascript
var options = {
    encryption: {
        saltBits: 256,
        algorithm: 'aes-256-cbc',
        iterations: 1
    },
    integrity: {
        saltBits: 256,
        algorithm: 'sha256',
        iterations: 1
    },
    ttl: 0,
    timestampSkewSec: 60,
    localtimeOffsetMsec: 0
};
```

Alternatively, a Buffer object of sufficient size (matching the algorithm key size requirement) can be passed as the
password, in which case, `saltBits` and `iterations` are ignored and the buffer is used as-is.


# Security Considerations

The greatest sources of security risks are usually found not in **iron** but in the policies and procedures surrounding its use.
Implementers are strongly encouraged to assess how this module addresses their security requirements. This section includes
an incomplete list of security considerations that must be reviewed and understood before using **iron**.


### Plaintext Storage of Credentials

The **iron** password is only used to derive keys and is never sent or shared. However, in order to generate (and regenerate) the
keys used to encrypt the object and compute the request MAC, the server must have access to the password in plaintext form. This
is in contrast, for example, to modern operating systems, which store only a one-way hash of user credentials.

If an attacker were to gain access to the password - or worse, to the server's database of all such password - he or she would be able
to encrypt and decrypt any sealed object. Accordingly, it is critical that servers protect these passwords from unauthorized
access.


# Frequently Asked Questions

### Where is the protocol specification?

If you are looking for some prose explaining how all this works, there isn't any. **iron** is being developed as an open source
project instead of a standard. In other words, the [code](/hueniverse/iron/tree/master/lib) is the specification. Not sure about
something? Open an issue!


### Is it done?

Pretty much. The API is locked and any changes to the 1.x branch will be backward compatible. Feel free to open issues with
questions and suggestions.


### How come the defaults must be manually passed and not automatically applied?

Because you should know what you are doing and explicitly set it. The options matter a lot to the security properties of the
implementation. While reasonable defaults are provided, you still need to explicitly state you want to use them.


# Acknowledgements

Special thanks to Adam Barth for his infinite patience, and always insightful feedback and advice.

The **iron** logo was based on origin artwork created by [Chris Carrasco](http://chriscarrasco.com).
