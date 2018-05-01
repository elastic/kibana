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
vagrant up centos-7 && vagrant ssh centos-7 -c 'cd /kbn-sandbox && npm run build' && vagrant halt centos-7
```

Testing:

```
# CentOS 6 - Not supported, tests will fail
vagrant up centos-6 && vagrant ssh centos-6 -c 'cd /kbn-sandbox && npm run test' && vagrant halt centos-6

# CentOS 7
vagrant up centos-7 && vagrant ssh centos-7 -c 'cd /kbn-sandbox && npm run test' && vagrant halt centos-7

# OEL 6 - Not supported, tests will fail
vagrant up oel-6 && vagrant ssh oel-6 -c 'cd /kbn-sandbox && npm run test' && vagrant halt oel-6

# OEL 7
vagrant up oel-7 && vagrant ssh oel-7 -c 'cd /kbn-sandbox && npm run test' && vagrant halt oel-7

# Fedora 26
vagrant up fedora-26 && vagrant ssh fedora-26 -c 'cd /kbn-sandbox && npm run test' && vagrant halt fedora-26

# Fedora 27
vagrant up fedora-27 && vagrant ssh fedora-27 -c 'cd /kbn-sandbox && npm run test' && vagrant halt fedora-27

# Ubuntu 14.04
vagrant up ubuntu-1404 && vagrant ssh ubuntu-1404 -c 'cd /kbn-sandbox && npm run test' && vagrant halt ubuntu-1404

# Ubuntu 16.04
vagrant up ubuntu-1604 && vagrant ssh ubuntu-1604 -c 'cd /kbn-sandbox && npm run test' && vagrant halt ubuntu-1604

# openSUSE 42
vagrant up opensuse-42 && vagrant ssh opensuse-42 -c 'cd /kbn-sandbox && npm run test' && vagrant halt opensuse-42

# Debian 7 - Not supported, tests will fail
vagrant up debian-7 && vagrant ssh debian-7 -c 'cd /kbn-sandbox && npm run test' && vagrant halt debian-7

# Debian 8
vagrant up debian-8 && vagrant ssh debian-8 -c 'cd /kbn-sandbox && npm run test' && vagrant halt debian-8

# Debian 9
vagrant up debian-9 && vagrant ssh debian-9 -c 'cd /kbn-sandbox && npm run test' && vagrant halt debian-9

# SLES 12
vagrant up sles-12 && vagrant ssh sles-12 -c 'cd /kbn-sandbox && npm run test' && vagrant halt sles-12
```