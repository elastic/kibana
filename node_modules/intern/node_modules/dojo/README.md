# Dojo 2 core [![Build Status](https://travis-ci.org/dojo/dojo2.png)](https://travis-ci.org/dojo/dojo2)

The Dojo 2 core library provides TypeScript & JavaScript authors with a complete set of tools for developing
well-structured, highly maintainable applications.


## Who should use Dojo?

Dojo 2 core is the best choice for teams that need a baseline set of robust, battle-tested tools for developing
applications, frameworks, and utilities. Dojo is the oldest actively developed JavaScript library, so is particularly
well suited for groups that are looking for something solid that will continue to exist and be maintained for years to
come.


## How Dojo 2 is different than Dojo 1

Dojo 2 core refines and enhances the original Dojo APIs, removing deprecated features and aligning terminology to match
additions made to EcmaScript since Dojo’s original release in 2004. Dojo 2 targets EcmaScript 5+ environments only, so
features that were in Dojo 1 that became part of the EcmaScript specification have been removed from the toolkit.

Because Dojo is primarily used by large teams of developers working on large applications, Dojo 2 is written in
[TypeScript](http://www.typescriptlang.org/). This allows Dojo users to take advantage of the many benefits of optional
static typing, and allows Dojo to be published to AMD, CommonJS, and ES6 module formats for use with native module
systems in every modern environment.

Finally, where the Dojo 1 code conventions were designed for a time before source code minifiers or JIT runtimes, Dojo
2’s code conventions are designed to emphasise code clarity and maintainability.


## How do I use Dojo 2?

For Node.js users, `npm install dojo@beta` will install the latest version of Dojo 2 precompiled to CJS format.

Other users will need to download and compile directly from the repository for the time being. Precompiled AMD modules
will be provided in the near future as our release tools are improved.


## How do I contribute?

1. [Open an issue](https://github.com/dojo/dojo2/issues) for the work you are going to do.
2. Sign the [Dojo Foundation Contributor License Agreement](http://dojofoundation.org/about/claForm).
   You only need to do this once to contribute to all Dojo Foundation projects.
3. Submit a pull request!


## Licensing information

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
