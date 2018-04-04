# node sandbox

An effort to allow nodejs processes (Kibana, specifically) to increase process security by reducing privileges.

## Using

This project offers pre-built cross-platform npm packages. To use this in your Kibana project, you can add the following to your `package.json`:

```json
{
    "dependencies": {
        "sandbox": "link:packages/kbn-sandbox""
    }
}
```

To use in your project:

```javascript
const sandbox = require("@kbn\sandbox");

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
yarn build-binaries
```

Testing:

```
yarn test
```