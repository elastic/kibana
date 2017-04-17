If you have a bugfix or new feature that you would like to contribute to Kibana, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

The process for contributing to any of the Elasticsearch repositories is similar.

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

  ```sh
  npm run elasticsearch
  ```

- Start the development server.

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

```sh
npm run test && npm run build
```

Distributable packages can be found in `target/` after the build completes.

#### Debugging test failures

The standard `npm run test` task runs several sub tasks and can take several minutes to complete, making debugging failures pretty painful. In order to ease the pain specialized tasks provide alternate methods for running the tests.

<dl>
  <dt><code>npm run test:quick</code></dt>
  <dd>Runs both server and browser tests, but skips linting</dd>

  <dt><code>npm run test:server</code> or <code>npm run test:browser</code></dt>
  <dd>Runs the tests for just the server or browser</dd>

  <dt><code>npm run test:dev</code></dt>
  <dd>
    Initializes an environment for debugging the browser tests. Includes an dedicated instance of the kibana server for building the test bundle, and a karma server. When running this task the build is optimized for the first time and then a karma-owned instance of the browser is opened. Click the "debug" button to open a new tab that executes the unit tests.
    <br>
    <img src="http://i.imgur.com/DwHxgfq.png">
  </dd>
</dl>

### Functional UI Testing

#### Handy references

- https://theintern.github.io/
- https://theintern.github.io/leadfoot/Element.html

#### Running tests using npm task:

*The ChromeDriver that is started currently only runs the tests in Chrome browser*

To run the functional UI tests, execute the following command:

`npm run test:ui`

The task above takes a little time to start the servers.  You can also start the servers and leave them running, and then run the tests separately:

`npm run test:ui:server` will start the server required to run the UI tests, leave this open

`npm run test:ui:runner` will run the frontend tests and close when complete

#### General notes:

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
gem install pleaserun -v 0.0.28
npm run build -- --skip-archives
```

To specify a package to build you can add `rpm` or `deb` as an argument.
```sh
npm run build -- --rpm
```

Distributable packages can be found in `target/` after the build completes.

### Submit a pull request

Push your local changes to your forked copy of the repository and submit a pull request. In the pull request, describe what your changes do and mention the number of the issue where discussion has taken place, eg “Closes #123″.

Always submit your pull against `master` unless the bug is only present in an older version. If the bug effects both `master` and another branch say so in your pull.

Then sit back and wait. There will probably be discussion about the pull request and, if any changes are needed, we'll work with you to get your pull request merged into Kibana.

### The road to review

After a pull is submitted, it needs to get to review. If you have commit permission on the Kibana repo you will probably perform these steps while submitting your pull request. If not, a member of the elastic organization will do them for you, though you can help by suggesting a reviewer for your changes if you've interacted with someone while working on the issue.

1. Assign the `review` tag. This signals to the team that someone needs to give this attention.
1. Assign version tags. If the pull is related to an existing issue (and it should be!), that issue probably has a version tag (eg `4.0.1`) on it. Assign the same version tag to your pull. You may end up with 2 or more version tags if the changes requires backporting
1. Find someone to review your pull. Don't just pick any yahoo, pick the right person. The right person might be the original reporter of the issue, but it might also be the person most familiar with the code you've changed. If neither of those things apply, or your change is small in scope, try to find someone on the Kibana team without a ton of existing reviews on their plate. As a rule, most pulls will require 2 reviewers, but the first reviewer will pick the 2nd.

### Review engaged

So, you've been assigned a pull to review. What's that look like?

Remember, someone is blocked by a pull awaiting review, make it count. Be thorough, the more action items you catch in the first review, the less back and forth will be required, and the better chance the pull has of being successful. Don't you like success?

1. **Understand the issue** that is being fixed, or the feature being added. Check the description on the pull, and check out the related issue. If you don't understand something, ask the person the submitter for clarification.
1. **Reproduce the bug** (or the lack of feature I guess?) in the destination branch, usually `master`. The referenced issue will help you here. If you're unable to reproduce the issue, contact the issue submitter for clarification
1. **Check out the pull** and test it. Is the issue fixed? Does it have nasty side effects? Try to create suspect inputs. If it operates on the value of a field try things like: strings (including an empty string), null, numbers, dates. Try to think of edge cases that might break the code.
1. **Read the code**. Understanding the changes will help you find additional things to test. Contact the submitter if you don't understand something.
1. **Go line-by-line**. Are there [style guide](https://github.com/elastic/kibana/blob/master/STYLEGUIDE.md) violations? Strangely named variables? Magic numbers? Do the abstractions make sense to you? Are things arranged in a testable way?
1. **Speaking of tests** Are they there? If a new function was added does it have tests? Do the tests, well, TEST anything? Do they just run the function or do they properly check the output?
1. **Suggest improvements** If there are changes needed, be explicit, comment on the lines in the code that you'd like changed. You might consider suggesting fixes. If you can't identify the problem, animated screenshots can help the review understand what's going on.
1. **Hand it back** If you found issues, re-assign the submitter to the pull to address them. Repeat until mergable.
1. **Hand it off** If you're the first reviewer and everything looks good but the changes are more than a few lines, hand the pull to someone else to take a second look. Again, try to find the right person to assign it to.
1. **Merge the code** When everything looks good, merge into the target branch. Check the labels on the pull to see if backporting is required, and perform the backport if so.
