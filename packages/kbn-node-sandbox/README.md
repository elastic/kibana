# node sandbox

An effort to allow nodejs processes (Kibana, specifically) to increase process security by reducing privileges.

## Build Status: 

* Windows: [![Build status](https://ci.appveyor.com/api/projects/status/677is5ga43sw0hs4?svg=true)](https://ci.appveyor.com/project/jordansissel/node-sandbox)
* Linux: [![Build Status](https://travis-ci.org/elastic/node-sandbox.svg?branch=master)](https://travis-ci.org/elastic/node-sandbox)

## Using

This project offers pre-built cross-platform npm packages. To use this in your nodejs project, you can add the following to your `package.json`:

```json
{
    "dependencies": {
        "sandbox": "https://github.com/elastic/node-sandbox/releases/download/v0.0.1/sandbox-0.0.1.tgz"
    }
}
```

To use in your project:

```javascript
const sandbox = require("sandbox");

// Sandboxing occurs synchronously and, if successful, the sandboxing controls
// are active when this activate method returns.
let r = sandbox.activate();
if (!r.success) {
    console.log("Failed to activate sandbox: " + r.message)
    // Assumedly if sandboxing fails, you want to exit to avoid running without sandbox protections.
    process.exit(1);
}
```

At this time, Windows x64 and Linux x64 platforms are supported. Other platforms will return a failure from the `activate()` method.


## Developing

Building requires you have a compiler environment available. For more details on setting up your build environment, the [node-gyp installation guide](https://github.com/nodejs/node-gyp#installation) is useful.

Building:

```
npm run build
```

Testing:

```
npm test
```

Packaging:

Note: Release packages are still composed by hand, but if you want to build local for a single platform, you can do this:

```
npm run build
npm test
npm pack
```