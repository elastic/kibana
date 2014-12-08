If you have a bugfix or new feature that you would like to contribute to Kibana, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

The process for contributing to any of the Elasticsearch repositories is similar.

### Sign the contributor license agreement

Please make sure you have signed the [Contributor License Agreement](http://www.elasticsearch.org/contributor-agreement/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.

#### Development Environment Setup

- Install node.js (we recommend using [nvm](https://github.com/creationix/nvm))

  ```sh
  ## follow directions at https://github.com/creationix/nvm, then
  nvm install 0.10
  ```

- Install ruby *1.9.3* (we recommend using [rbenv](https://github.com/sstephenson/rbenv))
  - See [rbenv docs](https://github.com/sstephenson/rbenv#installation) for installation assistance

  ```sh
  ## install ruby and ruby-build using your local package manager (apt, brew, etc)
  ## ex. brew install rbenv ruby-build
  - Run `rbenv init` and add `eval "$(rbenv init -)"` to your shell (ex. .bashrc/.bash_profile)
  - Run `rbenv install` to install the required version
  - Run `ruby -v` and make sure you are using 1.9.3
    - Check the installation docs if you have issues getting the correct version
  - Install bundler by running `gem install bundler`
  - Install local gems by running `cd src/server; bundle; cd ../..`
  ```

- Install grunt and bower globally

  ```sh
  npm install -g grunt-cli bower
  ```

- Install node, bower, and ruby dependencies

  ```sh
  npm install && bower install && cd src/server && bundle && cd ../..
  ```

- Start the development server.

  ```sh
  grunt dev # use the "--with-es" flag to install & start elasticsearch too
  ```
  
#### Testing and building

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
