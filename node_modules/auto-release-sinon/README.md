# auto-release-sinon

Simple sinon wrapper that automatically releases spys and stubs created within a suite.

Comes with an auto-hook module for use with mocha:
```
var sinon = require('auto-release-sinon/mocha');
```