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
docker build -t kbn-sandbox/build -f docker/Dockerfile.build .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/build:latest bash -c 'cd /kbn-sandbox && npm run build'
```

Testing:

```
# CentOS 7
docker build -t kbn-sandbox/centos7 -f docker/Dockerfile.centos7 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/centos7:latest bash -c 'cd /kbn-sandbox && npm run test'

# Ubuntu 14.04
docker build -t kbn-sandbox/ubuntu1404 -f docker/Dockerfile.ubuntu1404 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/ubuntu1404:latest bash -c 'cd /kbn-sandbox && npm run test'

# Ubuntu 16.04
docker build -t kbn-sandbox/ubuntu1604 -f docker/Dockerfile.ubuntu1604 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/ubuntu1604:latest bash -c 'cd /kbn-sandbox && npm run test'

# openSUSE 42.1
docker build -t kbn-sandbox/opensuse421 -f docker/Dockerfile.opensuse421 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/opensuse421:latest bash -c 'cd /kbn-sandbox && npm run test'

# openSUSE LEAP
docker build -t kbn-sandbox/opensuseleap -f docker/Dockerfile.opensuseleap .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/opensuseleap:latest bash -c 'cd /kbn-sandbox && npm run test'

# Debian 7
docker build -t kbn-sandbox/debian7 -f docker/Dockerfile.debian7 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/debian7:latest bash -c 'cd /kbn-sandbox && npm run test'

# Debian 8
docker build -t kbn-sandbox/debian8 -f docker/Dockerfile.debian8 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/debian8:latest bash -c 'cd /kbn-sandbox && npm run test'

# Debian 8 i386
docker build -t kbn-sandbox/debian8-i386 -f docker/Dockerfile.debian8-i386 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/debian8-i386:latest bash -c 'cd /kbn-sandbox && npm run test'

# Debian 9
docker build -t kbn-sandbox/debian9 -f docker/Dockerfile.debian9 .
docker run -it --rm -v `pwd`:/kbn-sandbox kbn-sandbox/debian9:latest bash -c 'cd /kbn-sandbox && npm run test'
```