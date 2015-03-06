If you have a bugfix or new feature that you would like to contribute to Kibana, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

The process for contributing to any of the Elasticsearch repositories is similar.

### Sign the contributor license agreement

Please make sure you have signed the [Contributor License Agreement](http://www.elasticsearch.org/contributor-agreement/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.

### Development Environment Setup

- Install node.js (we recommend using [nvm](https://github.com/creationix/nvm))

  ```sh
  ## follow directions at https://github.com/creationix/nvm, then
  nvm install 0.10
  ```

- Install grunt and bower globally (as root if not using nvm)

  ```sh
  npm install -g grunt-cli bower
  ```

- Install node and bower dependencies

  ```sh
  npm install && bower install
  ```

- Start the development server.

  ```sh
  grunt dev # use the "--with-es" flag to install & start elasticsearch too
  ```

#### Linting

A note about linting: We use both [jshint](http://jshint.com/) and [jscs](http://jscs.info/) to check that the [styleguide](STYLEGUIDE.md) is being followed. They run in a pre-commit hook and as a part of the tests, but most contributors integrate these linters with their code editors for real-time feedback.

Here are some hints for setting up the linters in your favorite editor:

| Editor | JSHint | JSCS |
| --- | --- | --- |
| Sublime | [SublimeLinter-jshint](https://github.com/SublimeLinter/SublimeLinter-jshint#installation) | [SublimeLinter-jscs](https://github.com/SublimeLinter/SublimeLinter-jscs#installation) |
| Atom | [linter-jshint](https://github.com/AtomLinter/linter-jshint#installation) | [linter-jscs](https://github.com/AtomLinter/linter-jscs#installation) |
| IntelliJ | Settings » Languages & Frameworks » JavaScript » Code Quality Tools » JSHint (be sure to check "Use config files") | « |
| vi | ask @simianhacker | « |


### Testing and building

To ensure that your changes will not break other functionality, please run the test suite and build process before submitting your pull request.

Before running the tests you will need to install the projects dependencies as described below.

Once that is complete just run:

```sh
grunt test build
```

Distributable, built packages can be found in `target/` after the build completes.

### Submit a pull request

Push your local changes to your forked copy of the repository and submit a pull request. In the pull request, describe what your changes do and mention the number of the issue where discussion has taken place, eg “Closes #123″.

Then sit back and wait. There will probably be discussion about the pull request and, if any changes are needed, we would love to work with you to get your pull request merged into Kibana.
