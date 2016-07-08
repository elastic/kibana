# Contributing to Kibana

## How issues work
At any given time the Kibana team at Elastic is working on dozens of features and enhancements to Kibana and other projects at Elastic. When you file an issue we'll take the time to digest it, consider solutions, and weigh its applicability to both the broad Kibana user base and our own goals for the project. Once we've completed that process we will assign the issue a priority.

- **P1**: A high priority issue that affects almost all Kibana users. Bugs that would cause incorrect results, security issues and features that would vastly improve the user experience for everyone. Work arounds for P1s generally don't exist without a code change.
- **P2**: A broadly applicable, high visibility, issue that enhances the usability of Kibana for a majority users.
- **P3**: Nice-to-have bug fixes or functionality. Work arounds for P3 items generally exist.
- **P4**: Niche and special interest issues that may not fit our core goals. We would take a high quality pull for this if implemented in such a way that it does not meaningfully impact other functionality or existing code. Issues may also be labeled P4 if they would be better implemented in Elasticsearch.
- **P5**: Highly niche or in opposition to our core goals. Should usually be closed. This doesn't mean we wouldn't take a pull for it, but if someone really wanted this they would be better off working on a plugin. The Kibana team will usually not work on P5 issues but may be willing to assist plugin developers on IRC.

#### How to express the importance of an issue
Let's just get this out there: **Feel free to +1 an issue**. That said, a +1 isn't a vote. We keep up on highly commented issues, but comments are but one of many reasons we might, or might not, work on an issue. A solid write up of your use case is more likely to make your case than a comment that says *+10000*.

#### My issue isn't getting enough attention
First of all, sorry about that, we want you to have a great time with Kibana! You should join us on IRC ([#kibana](https://kiwiirc.com/client/irc.freenode.net/?#kibana) on freenode) and chat about it. Github is terrible for conversations. With that out of the way, there are a number of variables that go into deciding what to work on. These include priority, impact, difficulty, applicability to use cases, and last, and importantly: What we feel like working on.

### I want to help!
**Now we're talking**. If you have a bugfix or new feature that you would like to contribute to Kibana, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

## How to contribute code

### Sign the contributor license agreement

Please make sure you have signed the [Contributor License Agreement](http://www.elastic.co/contributor-agreement/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.

### Development Environment Setup

- Clone the kibana repo and move into it

  ```sh
  git clone https://github.com/elastic/kibana.git kibana
  cd kibana
  ```

- Install the version of node.js listed in the `.node-version` file (this is made easy with tools like [nvm](https://github.com/creationix/nvm) and [avn](https://github.com/wbyoung/avn))

  ```sh
  nvm install "$(cat .node-version)"
  ```

- Install dependencies

  ```sh
  npm install
  ```

- Start elasticsearch

  Note: you need to have a java binary in `PATH` or set `JAVA_HOME`.

  ```sh
  npm run elasticsearch
  ```

- Start the development server. _On Windows, you'll need you use Git Bash, Cygwin, or a similar shell that exposes the `sh` command.  And to successfully build you'll need Cygwin optional packages zip, tar, and shasum._

  ```sh
  npm start
  ```

#### `config/kibana.dev.yml`

The `config/kibana.yml` file stores user configuration directives. Since this file is checked into source control, however, developer preferences can't be saved without the risk of accidentally committing the modified version. To make customizing configuration easier during development, the Kibana CLI will look for a `config/kibana.dev.yml` file if run with the `--dev` flag. This file behaves just like the non-dev version and accepts any of the [standard settings](https://www.elastic.co/guide/en/kibana/master/kibana-server-properties.html).

The `config/kibana.dev.yml` file is very commonly used to store some opt-in/**unsafe** optimizer tweaks which can significantly increase build performance. Below is a commonly used `config/kibana.dev.yml` file, but additional options can be found [in #4611](https://github.com/elastic/kibana/pull/4611#issue-99706918).

```yaml
optimize:
  sourceMaps: '#cheap-source-map' # options -> http://webpack.github.io/docs/configuration.html#devtool
  unsafeCache: true
  lazyPrebuild: false
```

#### SSL

When Kibana runs in development mode it will automatically use bundled SSL certificates. These certificates won't be trusted by your OS by default which will likely cause your browser to complain about the cert. You can deal with this in a few ways:

  1. Supply your own cert using the `config/kibana.dev.yml` file.
  1. Configure your OS to trust the cert:
    - OSX: https://www.accuweaver.com/2014/09/19/make-chrome-accept-a-self-signed-certificate-on-osx/
    - Window: http://stackoverflow.com/a/1412118
    - Linux: http://unix.stackexchange.com/a/90607
  1. Click through the warning and accept future warnings.
  1. Disable SSL with the `--no-ssl` flag:
    - `npm start -- --no-ssl`


#### Linting

A note about linting: We use [eslint](http://eslint.org) to check that the [styleguide](STYLEGUIDE.md) is being followed. It runs in a pre-commit hook and as a part of the tests, but most contributors integrate it with their code editors for real-time feedback.

Here are some hints for getting eslint setup in your favorite editor:

| Editor | Plugin |
| --- | --- | --- |
| Sublime | [SublimeLinter-eslint](https://github.com/roadhump/SublimeLinter-eslint#installation) |
| Atom | [linter-eslint](https://github.com/AtomLinter/linter-eslint#installation) |
| IntelliJ | Settings » Languages & Frameworks » JavaScript » Code Quality Tools » ESLint |
| vi | [scrooloose/syntastic](https://github.com/scrooloose/syntastic) |

Another tool we use for enforcing consistent coding style is Editorconfig, which can be set up by installing a plugin in your editor that dynamically updates its configuration. Take a look at the [Editorconfig](http://editorconfig.org/#download) site to find a plugin for your editor, and browse our [`.editorconfig`](https://github.com/elastic/kibana/blob/master/.editorconfig) file to see what config rules we set up.

### Testing and building

To ensure that your changes will not break other functionality, please run the test suite and build process before submitting your pull request.

Before running the tests you will need to install the projects dependencies as described above.

Once that is complete just run:

```
sh
npm run test && npm run build -- --skip-os-packages
```

#### Debugging unit tests

The standard `npm run test` task runs several sub tasks and can take several minutes to complete, making debugging failures pretty painful. In order to ease the pain specialized tasks provide alternate methods for running the tests.


`npm run test:quick`
Runs both server and browser tests, but skips linting

`npm run test:server`
Run only the server tests

`npm run test:browser`
Run only the browser tests. Coverage reports are available for browser tests by running `npm run test:coverage`. You can find the results under the `coverage/` directory that will be created upon completion.

`npm run test:dev`
Initializes an environment for debugging the browser tests. Includes an dedicated instance of the kibana server for building the test bundle, and a karma server. When running this task the build is optimized for the first time and then a karma-owned instance of the browser is opened. Click the "debug" button to open a new tab that executes the unit tests.
![Browser test debugging](http://i.imgur.com/DwHxgfq.png)

`npm run mocha [test file or dir]` or `npm run mocha:debug [test file or dir]`
Run a one off test with the local project version of mocha, babel compilation, and optional debugging. Great
for development and fixing individual tests.

#### Unit testing plugins
This should work super if you're using the [Kibana plugin generator](https://github.com/elastic/generator-kibana-plugin). If you're not using the generator, well, you're on your own. We suggest you look at how the generator works.

`npm run test:dev -- --kbnServer.testsBundle.pluginId=some_special_plugin --kbnServer.plugin-path=../some_special_plugin`
Run the tests for just your particular plugin. Assuming you plugin lives outside of the `plugins directory`, which it should.

#### Running browser automation tests:

The following will start Kibana, Elasticsearch and the chromedriver for you. To run the functional UI tests use the following commands

`npm run test:ui`
Run the functional UI tests one time and exit. This is used by the CI systems and is great for quickly checking that things pass. It is essentially a combination of the next two tasks.

`npm run test:ui:server`
Start the server required for the `test:ui:runner` tasks. Once the server is started `test:ui:runner` can be run multiple times without waiting for the server to start.

`npm run test:ui:runner`
Execute the front-end browser tests. This requires the server started by the `test:ui:server` task.

#### Browser automation notes:

- Using Page Objects pattern (https://theintern.github.io/intern/#writing-functional-test)
- At least the initial tests for the Settings, Discover, and Visualize tabs all depend on a very specific set of logstash-type data (generated with makelogs).  Since that is a static set of data, all the Discover and Visualize tests use a specific Absolute time range.  This guarantees the same results each run.
- These tests have been developed and tested with Chrome and Firefox browser.  In theory, they should work on all browsers (that's the benefit of Intern using Leadfoot).
- These tests should also work with an external testing service like https://saucelabs.com/ or https://www.browserstack.com/ but that has not been tested.
- https://theintern.github.io/
- https://theintern.github.io/leadfoot/module-leadfoot_Element.html

#### Building OS packages

Packages are built using fpm, pleaserun, dpkg, and rpm.  fpm and pleaserun can be installed using gem.  Package building has only been tested on Linux and is not supported on any other platform.
```sh
apt-get install ruby-dev rpm
gem install fpm -v 1.5.0
gem install pleaserun -v 0.0.24
npm run build -- --skip-archives
```

To specify a package to build you can add `rpm` or `deb` as an argument.
```sh
npm run build -- --rpm
```

Distributable packages can be found in `target/` after the build completes.

## Submitting a pull request

Push your local changes to your forked copy of the repository and submit a pull request. In the pull request, describe what your changes do and mention the number of the issue where discussion has taken place, eg “Closes #123″.

Always submit your pull against `master` unless the bug is only present in an older version. If the bug effects both `master` and another branch say so in your pull.

Then sit back and wait. There will probably be discussion about the pull request and, if any changes are needed, we'll work with you to get your pull request merged into Kibana.

### The road to review

After a pull is submitted, it needs to get to review. If you have commit permission on the Kibana repo you will probably perform these steps while submitting your pull request. If not, a member of the elastic organization will do them for you, though you can help by suggesting a reviewer for your changes if you've interacted with someone while working on the issue.

1. Assign the `review` label. This signals to the team that someone needs to give this attention.
1. Do **not** assign a version label. Someone from Elastic staff will assign a version label, if necessary, when your pull request is ready to be merged.
1. Find someone to review your pull. Don't just pick any yahoo, pick the right person. The right person might be the original reporter of the issue, but it might also be the person most familiar with the code you've changed. If neither of those things apply, or your change is small in scope, try to find someone on the Kibana team without a ton of existing reviews on their plate. As a rule, most pulls will require 2 reviewers, but the first reviewer will pick the 2nd.

### Review engaged

So, you've been assigned a pull to review. What's that look like?

Remember, someone is blocked by a pull awaiting review, make it count. Be thorough, the more action items you catch in the first review, the less back and forth will be required, and the better chance the pull has of being successful. Don't you like success?

1. **Understand the issue** that is being fixed, or the feature being added. Check the description on the pull, and check out the related issue. If you don't understand something, ask the submitter for clarification.
1. **Reproduce the bug** (or the lack of feature I guess?) in the destination branch, usually `master`. The referenced issue will help you here. If you're unable to reproduce the issue, contact the issue submitter for clarification
1. **Check out the pull** and test it. Is the issue fixed? Does it have nasty side effects? Try to create suspect inputs. If it operates on the value of a field try things like: strings (including an empty string), null, numbers, dates. Try to think of edge cases that might break the code.
1. **Merge the target branch**. It is possible that tests or the linter have been updated in the target branch since the pull was submitted. Merging the pull could cause core to start failing.
1. **Read the code**. Understanding the changes will help you find additional things to test. Contact the submitter if you don't understand something.
1. **Go line-by-line**. Are there [style guide](https://github.com/elastic/kibana/blob/master/STYLEGUIDE.md) violations? Strangely named variables? Magic numbers? Do the abstractions make sense to you? Are things arranged in a testable way?
1. **Speaking of tests** Are they there? If a new function was added does it have tests? Do the tests, well, TEST anything? Do they just run the function or do they properly check the output?
1. **Suggest improvements** If there are changes needed, be explicit, comment on the lines in the code that you'd like changed. You might consider suggesting fixes. If you can't identify the problem, animated screenshots can help the review understand what's going on.
1. **Hand it back** If you found issues, re-assign the submitter to the pull to address them. Repeat until mergable.
1. **Hand it off** If you're the first reviewer and everything looks good but the changes are more than a few lines, hand the pull to someone else to take a second look. Again, try to find the right person to assign it to.
1. **Merge the code** When everything looks good, merge into the target branch. Check the labels on the pull to see if backporting is required, and perform the backport if so.
