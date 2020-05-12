# Contributing to Kibana

We understand that you may not have days at a time to work on Kibana. We ask that you read our contributing guidelines carefully so that you spend less time, overall, struggling to push your PR through our code review processes.

At the same time, reading the contributing guidelines will give you a better idea of how to post meaningful issues that will be more easily be parsed, considered, and resolved. A big win for everyone involved! :tada:

## Table of Contents

A high level overview of our contributing guidelines.

- [Effective issue reporting in Kibana](#effective-issue-reporting-in-kibana)
  - [Voicing the importance of an issue](#voicing-the-importance-of-an-issue)
  - ["My issue isn't getting enough attention"](#my-issue-isnt-getting-enough-attention)
  - ["I want to help!"](#i-want-to-help)
- [How We Use Git and GitHub](#how-we-use-git-and-github)
  - [Branching](#branching)
  - [Commits and Merging](#commits-and-merging)
  - [What Goes Into a Pull Request](#what-goes-into-a-pull-request)
- [Contributing Code](#contributing-code)
  - [Setting Up Your Development Environment](#setting-up-your-development-environment)
    - [Customizing `config/kibana.dev.yml`](#customizing-configkibanadevyml)
    - [Setting Up SSL](#setting-up-ssl)
  - [Linting](#linting)
  - [Internationalization](#internationalization)
  - [Localization](#localization)
  - [Testing and Building](#testing-and-building)
    - [Debugging server code](#debugging-server-code)
    - [Instrumenting with Elastic APM](#instrumenting-with-elastic-apm)
  - [Debugging Unit Tests](#debugging-unit-tests)
  - [Unit Testing Plugins](#unit-testing-plugins)
  - [Automated Accessibility Testing](#automated-accessibility-testing)
  - [Cross-browser compatibility](#cross-browser-compatibility)
    - [Testing compatibility locally](#testing-compatibility-locally)
    - [Running Browser Automation Tests](#running-browser-automation-tests)
      - [Browser Automation Notes](#browser-automation-notes)
  - [Building OS packages](#building-os-packages)
  - [Writing documentation](#writing-documentation)
  - [Release Notes Process](#release-notes-process)
- [Signing the contributor license agreement](#signing-the-contributor-license-agreement)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Reviewing](#code-reviewing)
  - [Getting to the Code Review Stage](#getting-to-the-code-review-stage)
  - [Reviewing Pull Requests](#reviewing-pull-requests)

Don't fret, it's not as daunting as the table of contents makes it out to be!

## Effective issue reporting in Kibana

### Voicing the importance of an issue

We seriously appreciate thoughtful comments. If an issue is important to you, add a comment with a solid write up of your use case and explain why it's so important. Please avoid posting comments comprised solely of a thumbs up emoji 👍.

Granted that you share your thoughts, we might even be able to come up with creative solutions to your specific problem. If everything you'd like to say has already been brought up but you'd still like to add a token of support, feel free to add a [👍 thumbs up reaction](https://github.com/blog/2119-add-reactions-to-pull-requests-issues-and-comments) on the issue itself and on the comment which best summarizes your thoughts.

### "My issue isn't getting enough attention"

First of all, **sorry about that!** We want you to have a great time with Kibana.

There's hundreds of open issues and prioritizing what to work on is an important aspect of our daily jobs. We prioritize issues according to impact and difficulty, so some issues can be neglected while we work on more pressing issues.

Feel free to bump your issues if you think they've been neglected for a prolonged period.

### "I want to help!"

**Now we're talking**. If you have a bug fix or new feature that you would like to contribute to Kibana, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

## How We Use Git and GitHub

### Forking

We follow the [GitHub forking model](https://help.github.com/articles/fork-a-repo/) for collaborating
on Kibana code. This model assumes that you have a remote called `upstream` which points to the
official Kibana repo, which we'll refer to in later code snippets.

### Branching

* All work on the next major release goes into master.
* Past major release branches are named `{majorVersion}.x`. They contain work that will go into the next minor release. For example, if the next minor release is `5.2.0`, work for it should go into the `5.x` branch.
* Past minor release branches are named `{majorVersion}.{minorVersion}`. They contain work that will go into the next patch release. For example, if the next patch release is `5.3.1`, work for it should go into the `5.3` branch.
* All work is done on feature branches and merged into one of these branches.
* Where appropriate, we'll backport changes into older release branches.

### Commits and Merging

* Feel free to make as many commits as you want, while working on a branch.
* When submitting a PR for review, please perform an interactive rebase to present a logical history that's easy for the reviewers to follow.
* Please use your commit messages to include helpful information on your changes, e.g. changes to APIs, UX changes, bugs fixed, and an explanation of *why* you made the changes that you did.
* Resolve merge conflicts by rebasing the target branch over your feature branch, and force-pushing (see below for instructions).
* When merging, we'll squash your commits into a single commit.

#### Rebasing and fixing merge conflicts

Rebasing can be tricky, and fixing merge conflicts can be even trickier because it involves force pushing. This is all compounded by the fact that attempting to push a rebased branch remotely will be rejected by git, and you'll be prompted to do a `pull`, which is not at all what you should do (this will really mess up your branch's history).

Here's how you should rebase master onto your branch, and how to fix merge conflicts when they arise.

First, make sure master is up-to-date.

```
git checkout master
git fetch upstream
git rebase upstream/master
```

Then, check out your branch and rebase master on top of it, which will apply all of the new commits on master to your branch, and then apply all of your branch's new commits after that.

```
git checkout name-of-your-branch
git rebase master
```

You want to make sure there are no merge conflicts. If there are merge conflicts, git will pause the rebase and allow you to fix the conflicts before continuing.

You can use `git status` to see which files contain conflicts. They'll be the ones that aren't staged for commit. Open those files, and look for where git has marked the conflicts. Resolve the conflicts so that the changes you want to make to the code have been incorporated in a way that doesn't destroy work that's been done in master. Refer to master's commit history on GitHub if you need to gain a better understanding of how code is conflicting and how best to resolve it.

Once you've resolved all of the merge conflicts, use `git add -A` to stage them to be committed, and then use `git rebase --continue` to tell git to continue the rebase.

When the rebase has completed, you will need to force push your branch because the history is now completely different than what's on the remote. **This is potentially dangerous** because it will completely overwrite what you have on the remote, so you need to be sure that you haven't lost any work when resolving merge conflicts. (If there weren't any merge conflicts, then you can force push without having to worry about this.)

```
git push origin name-of-your-branch --force
```

This will overwrite the remote branch with what you have locally. You're done!

**Note that you should not run `git pull`**, for example in response to a push rejection like this:

```
! [rejected] name-of-your-branch -> name-of-your-branch (non-fast-forward)
error: failed to push some refs to 'https://github.com/YourGitHubHandle/kibana.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. Integrate the remote changes (e.g.
hint: 'git pull ...') before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```

Assuming you've successfully rebased and you're happy with the code, you should force push instead.

### What Goes Into a Pull Request

* Please include an explanation of your changes in your PR description.
* Links to relevant issues, external resources, or related PRs are very important and useful.
* Please update any tests that pertain to your code, and add new tests where appropriate.
* See [Submitting a Pull Request](#submitting-a-pull-request) for more info.

## Contributing Code

These guidelines will help you get your Pull Request into shape so that a code review can start as soon as possible.

### Setting Up Your Development Environment

Fork, then clone the `kibana` repo and change directory into it

```bash
git clone https://github.com/[YOUR_USERNAME]/kibana.git kibana
cd kibana
```

Install the version of Node.js listed in the `.node-version` file. This can be automated with tools such as [nvm](https://github.com/creationix/nvm), [nvm-windows](https://github.com/coreybutler/nvm-windows) or [avn](https://github.com/wbyoung/avn). As we also include a `.nvmrc` file you can switch to the correct version when using nvm by running:

```bash
nvm use
```

Install the latest version of [yarn](https://yarnpkg.com).

Bootstrap Kibana and install all the dependencies

```bash
yarn kbn bootstrap
```

> Node.js native modules could be in use and node-gyp is the tool used to build them. There are tools you need to install per platform and python versions you need to be using. Please see https://github.com/nodejs/node-gyp#installation and follow the guide according your platform.

(You can also run `yarn kbn` to see the other available commands. For more info about this tool, see https://github.com/elastic/kibana/tree/master/packages/kbn-pm.)

When switching branches which use different versions of npm packages you may need to run;
```bash
yarn kbn clean
```

If you have failures during `yarn kbn bootstrap` you may have some corrupted packages in your yarn cache which you can clean with;
```bash
yarn cache clean
```

#### Increase node.js heap size

Kibana is a big project and for some commands it can happen that the process hits the default heap limit and crashes with an out-of-memory error. If you run into this problem, you can increase maximum heap size by setting the `--max_old_space_size` option on the command line. To set the limit for all commands, simply add the following line to your shell config: `export NODE_OPTIONS="--max_old_space_size=2048"`.

### Running Elasticsearch Locally

There are a few options when it comes to running Elasticsearch locally:

#### Nightly snapshot (recommended)

These snapshots are built on a nightly basis which expire after a couple weeks. If running from an old, untracted branch this snapshot might not exist. In which case you might need to run from source or an archive.

```bash
yarn es snapshot
```

##### Keeping data between snapshots

If you want to keep the data inside your Elasticsearch between usages of this command,
you should use the following command, to keep your data folder outside the downloaded snapshot
folder:

```bash
yarn es snapshot -E path.data=../data
```

The same parameter can be used with the source and archive command shown in the following
paragraphs.

#### Source

By default, it will reference an [elasticsearch](https://github.com/elastic/elasticsearch) checkout which is a sibling to the Kibana directory named `elasticsearch`. If you wish to use a checkout in another location you can provide that by supplying `--source-path`

```bash
yarn es source
```

#### Archive

Use this if you already have a distributable. For released versions, one can be obtained on the [Elasticsearch downloads](https://www.elastic.co/downloads/elasticsearch) page.

```bash
yarn es archive <full_path_to_archive>
```

**Each of these will run Elasticsearch with a `basic` license. Additional options are available, pass `--help` for more information.**

##### Sample Data

If you're just getting started with Elasticsearch, you could use the following command to populate your instance with a few fake logs to hit the ground running.

```bash
node scripts/makelogs --auth <username>:<password>
```
> The default username and password combination are `elastic:changeme`

> Make sure to execute `node scripts/makelogs` *after* elasticsearch is up and running!

### Running Elasticsearch Remotely

You can save some system resources, and the effort of generating sample data, if you have a remote Elasticsearch cluster to connect to. (**Elasticians: you do! Check with your team about where to find credentials**)

You'll need to [create a `kibana.dev.yml`](#customizing-configkibanadevyml) and add the following to it:

```
elasticsearch.hosts:
  - {{ url }}
elasticsearch.username: {{ username }}
elasticsearch.password: {{ password }}
elasticsearch.ssl.verificationMode: none
```

If many other users will be interacting with your remote cluster, you'll want to add the following to avoid causing conflicts:

```
kibana.index: '.{YourGitHubHandle}-kibana'
xpack.task_manager.index: '.{YourGitHubHandle}-task-manager-kibana'
```

### Running remote clusters
Setup remote clusters for cross cluster search (CCS) and cross cluster replication (CCR).

Start your primary cluster by running:
```bash
yarn es snapshot -E path.data=../data_prod1
```

Start your remote cluster by running:
```bash
yarn es snapshot -E transport.port=9500 -E http.port=9201 -E path.data=../data_prod2
```

Once both clusters are running, start kibana. Kibana will connect to the primary cluster.

Setup the remote cluster in Kibana from either `Management` -> `Elasticsearch` -> `Remote Clusters` UI or by running the following script in `Console`.
```
PUT _cluster/settings
{
  "persistent": {
    "cluster": {
      "remote": {
        "cluster_one": {
          "seeds": [
            "localhost:9500"
          ]
        }
      }
    }
  }
}
```

Follow the [cross-cluster search](https://www.elastic.co/guide/en/kibana/current/management-cross-cluster-search.html) instructions for setting up index patterns to search across clusters.

### Running Kibana

Change to your local Kibana directory.
Start the development server.

```bash
yarn start
```

> On Windows, you'll need to use Git Bash, Cygwin, or a similar shell that exposes the `sh` command.  And to successfully build you'll need Cygwin optional packages zip, tar, and shasum.

Now you can point your web browser to http://localhost:5601 and start using Kibana! When running `yarn start`, Kibana will also log that it is listening on port 5603 due to the base path proxy, but you should still access Kibana on port 5601.

By default, you can log in with username `elastic` and password `changeme`. See the `--help` options on `yarn es <command>` if you'd like to configure a different password.

#### Running Kibana in Open-Source mode

If you're looking to only work with the open-source software, supply the license type to `yarn es`:

```bash
yarn es snapshot --license oss
```

And start Kibana with only open-source code:

```bash
yarn start --oss
```

#### Unsupported URL Type

If you're installing dependencies and seeing an error that looks something like

```
Unsupported URL Type: link:packages/eslint-config-kibana
```

you're likely running `npm`. To install dependencies in Kibana you need to run `yarn kbn bootstrap`. For more info, see [Setting Up Your Development Environment](#setting-up-your-development-environment) above.

#### Customizing `config/kibana.dev.yml`

The `config/kibana.yml` file stores user configuration directives. Since this file is checked into source control, however, developer preferences can't be saved without the risk of accidentally committing the modified version. To make customizing configuration easier during development, the Kibana CLI will look for a `config/kibana.dev.yml` file if run with the `--dev` flag. This file behaves just like the non-dev version and accepts any of the [standard settings](https://www.elastic.co/guide/en/kibana/current/settings.html).

#### Potential Optimization Pitfalls

 - Webpack is trying to include a file in the bundle that I deleted and is now complaining about it is missing
 - A module id that used to resolve to a single file now resolves to a directory, but webpack isn't adapting
 - (if you discover other scenarios, please send a PR!)

#### Setting Up SSL

Kibana includes self-signed certificates that can be used for development purposes in the browser and for communicating with Elasticsearch: `yarn start --ssl` & `yarn es snapshot --ssl`.

### Linting

A note about linting: We use [eslint](http://eslint.org) to check that the [styleguide](STYLEGUIDE.md) is being followed. It runs in a pre-commit hook and as a part of the tests, but most contributors integrate it with their code editors for real-time feedback.

Here are some hints for getting eslint setup in your favorite editor:

Editor     | Plugin
-----------|-------------------------------------------------------------------------------
Sublime    | [SublimeLinter-eslint](https://github.com/roadhump/SublimeLinter-eslint#installation)
Atom       | [linter-eslint](https://github.com/AtomLinter/linter-eslint#installation)
VSCode     | [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
IntelliJ   | Settings » Languages & Frameworks » JavaScript » Code Quality Tools » ESLint
`vi`       | [scrooloose/syntastic](https://github.com/scrooloose/syntastic)

Another tool we use for enforcing consistent coding style is EditorConfig, which can be set up by installing a plugin in your editor that dynamically updates its configuration. Take a look at the [EditorConfig](http://editorconfig.org/#download) site to find a plugin for your editor, and browse our [`.editorconfig`](https://github.com/elastic/kibana/blob/master/.editorconfig) file to see what config rules we set up.

#### Setup Guide for VS Code Users

Note that for VSCode, to enable "live" linting of TypeScript (and other) file types, you will need to modify your local settings, as shown below.  The default for the ESLint extension is to only lint JavaScript file types.

```json
"eslint.validate": [
  "javascript",
  "javascriptreact",
  { "language": "typescript", "autoFix": true },
  { "language": "typescriptreact", "autoFix": true }
]
```

`eslint` can automatically fix trivial lint errors when you save a file by adding this line in your setting.

```json
  "eslint.autoFixOnSave": true,
```

:warning: It is **not** recommended to use the [`Prettier` extension/IDE plugin](https://prettier.io/) while maintaining the Kibana project. Formatting and styling roles are set in the multiple `.eslintrc.js` files across the project and some of them use the [NPM version of Prettier](https://www.npmjs.com/package/prettier). Using the IDE extension might cause conflicts, applying the formatting to too many files that shouldn't be prettier-ized and/or highlighting errors that are actually OK.

### Internationalization

All user-facing labels and info texts in Kibana should be internationalized. Please take a look at the [readme](packages/kbn-i18n/README.md) and the [guideline](packages/kbn-i18n/GUIDELINE.md) of the i18n package on how to do so.

In order to enable translations in the React parts of the application, the top most component of every `ReactDOM.render` call should be the `Context` component from the `i18n` core service:
```jsx
const I18nContext = coreStart.i18n.Context;

ReactDOM.render(
  <I18nContext>
      {myComponentTree}
  </I18nContext>,
  container
);
```

There are a number of tools created to support internationalization in Kibana that would allow one to validate internationalized labels,
extract them to a `JSON` file or integrate translations back to Kibana. To know more, please read corresponding [readme](src/dev/i18n/README.md) file.

### Localization

We cannot support accepting contributions to the translations from any source other than the translators we have engaged to do the work.
We are still to develop a proper process to accept any contributed translations. We certainly appreciate that people care enough about the localization effort to want to help improve the quality. We aim to build out a more comprehensive localization process for the future and will notify you once contributions can be supported, but for the time being, we are not able to incorporate suggestions.

### Syling with SASS

When writing a new component, create a sibling SASS file of the same name and import directly into the JS/TS component file. Doing so ensures the styles are never separated or lost on import and allows for better modularization (smaller individual plugin asset footprint).

Any JavaScript (or TypeScript) file that imports SASS (.scss) files will automatically build with the [EUI](https://elastic.github.io/eui/#/guidelines/sass) & Kibana invisibles (SASS variables, mixins, functions) from the [`styling_constants.scss` file](https://github.com/elastic/kibana/blob/master/src/legacy/ui/public/styles/_styling_constants.scss). However, any Legacy (file path includes `/legacy`) files will not.

**Example:**

```tsx
// component.tsx

import './component.scss';

export const Component = () => {
  return (
    <div className="plgComponent" />
  );
}
```

```scss
// component.scss

.plgComponent { ... }
```

Do not use the underscore `_` SASS file naming pattern when importing directly into a javascript file.

### Testing and Building

To ensure that your changes will not break other functionality, please run the test suite and build process before submitting your Pull Request.

Before running the tests you will need to install the projects dependencies as described above.

Once that's done, just run:

```bash
yarn test && yarn build --skip-os-packages
```

You can get all build options using the following command:

```bash
yarn build --help
```

macOS users on a machine with a discrete graphics card may see significant speedups (up to 2x) when running tests by changing your terminal emulator's GPU settings. In iTerm2:
- Open Preferences (Command + ,)
- In the General tab, under the "Magic" section, ensure "GPU rendering" is checked
- Open "Advanced GPU Settings..."
- Uncheck the "Prefer integrated to discrete GPU" option
- Restart iTerm

### Debugging Server Code
`yarn debug` will start the server with Node's inspect flag. Kibana's development mode will start three processes on ports `9229`, `9230`, and `9231`. Chrome's developer tools need to be configured to connect to all three connections. Add `localhost:<port>` for each Kibana process in Chrome's developer tools connection tab.

### Instrumenting with Elastic APM
Kibana ships with the [Elastic APM Node.js Agent](https://github.com/elastic/apm-agent-nodejs) built-in for debugging purposes.

Its default configuration is meant to be used by core Kibana developers only, but it can easily be re-configured to your needs.
In its default configuration it's disabled and will, once enabled, send APM data to a centrally managed Elasticsearch cluster accessible only to Elastic employees.

To change the location where data is sent, use the [`serverUrl`](https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#server-url) APM config option.
To activate the APM agent, use the [`active`](https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#active) APM config option.

All config options can be set either via environment variables, or by creating an appropriate config file under `config/apm.dev.js`.
For more information about configuring the APM agent, please refer to [the documentation](https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuring-the-agent.html).

Example `config/apm.dev.js` file:

```js
module.exports = {
  active: true,
};
```

Once the agent is active, it will trace all incoming HTTP requests to Kibana, monitor for errors, and collect process-level metrics.
The collected data will be sent to the APM Server and is viewable in the APM UI in Kibana.

### Unit testing frameworks
Kibana is migrating unit testing from Mocha to Jest. Legacy unit tests still
exist in Mocha but all new unit tests should be written in Jest. Mocha tests
are contained in `__tests__` directories. Whereas Jest tests are stored in
the same directory as source code files with the `.test.js` suffix.

### Running specific Kibana tests

The following table outlines possible test file locations and how to invoke them:

| Test runner        | Test location                                                                                                                                           | Runner command (working directory is kibana root)                                       |
| -----------------  | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Jest               | `src/**/*.test.js`<br>`src/**/*.test.ts`                                                                                                                | `yarn test:jest -t regexp [test path]`                                               |
| Jest (integration) | `**/integration_tests/**/*.test.js`                                                                                                                     | `yarn test:jest_integration -t regexp [test path]`                                   |
| Mocha              | `src/**/__tests__/**/*.js`<br>`!src/**/public/__tests__/*.js`<br>`packages/kbn-datemath/test/**/*.js`<br>`packages/kbn-dev-utils/src/**/__tests__/**/*.js`<br>`tasks/**/__tests__/**/*.js` | `node scripts/mocha --grep=regexp [test path]`       |
| Functional         | `test/*integration/**/config.js`<br>`test/*functional/**/config.js`<br>`test/accessibility/config.js`                                                                                    | `yarn test:ftr:server --config test/[directory]/config.js`<br>`yarn test:ftr:runner --config test/[directory]/config.js --grep=regexp`       |
| Karma              | `src/**/public/__tests__/*.js`                                                                                                                          | `yarn test:karma:debug`                                                                      |

For X-Pack tests located in `x-pack/` see [X-Pack Testing](x-pack/README.md#testing)

Test runner arguments:
 - Where applicable, the optional arguments `-t=regexp` or `--grep=regexp` will only run tests or test suites whose descriptions matches the regular expression.
 - `[test path]` is the relative path to the test file.

 Examples:
  - Run the entire elasticsearch_service test suite:
    ```
    yarn test:jest src/core/server/elasticsearch/elasticsearch_service.test.ts
    ```
  - Run the jest test case whose description matches `stops both admin and data clients`:
    ```
    yarn test:jest -t 'stops both admin and data clients' src/core/server/elasticsearch/elasticsearch_service.test.ts
    ```
  - Run the api integration test case whose description matches the given string:
    ```
    yarn test:ftr:server --config test/api_integration/config.js
    yarn test:ftr:runner --config test/api_integration/config.js --grep='should return 404 if id does not match any sample data sets'
    ```

### Debugging Unit Tests

The standard `yarn test` task runs several sub tasks and can take several minutes to complete, making debugging failures pretty painful. In order to ease the pain specialized tasks provide alternate methods for running the tests.

You could also add the `--debug` option so that `node` is run using the `--debug-brk` flag. You'll need to connect a remote debugger such as [`node-inspector`](https://github.com/node-inspector/node-inspector) to proceed in this mode.

```bash
node scripts/mocha --debug <file>
```

With `yarn test:karma`, you can run only the browser tests. Coverage reports are available for browser tests by running `yarn test:coverage`. You can find the results under the `coverage/` directory that will be created upon completion.

```bash
yarn test:karma
```

Using `yarn test:karma:debug` initializes an environment for debugging the browser tests. Includes an dedicated instance of the kibana server for building the test bundle, and a karma server. When running this task the build is optimized for the first time and then a karma-owned instance of the browser is opened. Click the "debug" button to open a new tab that executes the unit tests.

```bash
yarn test:karma:debug
```

In the screenshot below, you'll notice the URL is `localhost:9876/debug.html`. You can append a `grep` query parameter to this URL and set it to a string value which will be used to exclude tests which don't match. For example, if you changed the URL to `localhost:9876/debug.html?query=my test` and then refreshed the browser, you'd only see tests run which contain "my test" in the test description.


![Browser test debugging](http://i.imgur.com/DwHxgfq.png)

### Unit Testing Plugins

This should work super if you're using the [Kibana plugin generator](https://github.com/elastic/kibana/tree/master/packages/kbn-plugin-generator). If you're not using the generator, well, you're on your own. We suggest you look at how the generator works.

To run the tests for just your particular plugin run the following command from your plugin:

```bash
yarn test:mocha
yarn test:karma:debug # remove the debug flag to run them once and close
```

### Automated Accessibility Testing

To run the tests locally:

1. In one terminal window run `node scripts/functional_tests_server --config test/accessibility/config.ts`
2. In another terminal window run `node scripts/functional_test_runner.js --config test/accessibility/config.ts`

To run the x-pack tests, swap the config file out for `x-pack/test/accessibility/config.ts`.

After the server is up, you can go to this instance of Kibana at `localhost:5620`.

The testing is done using [axe](https://github.com/dequelabs/axe-core). The same thing that runs in CI,
can be run locally using their browser plugins:

- [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

### Cross-browser Compatibility

#### Testing Compatibility Locally

##### Testing IE on OS X

* [Download VMWare Fusion](http://www.vmware.com/products/fusion/fusion-evaluation.html).
* [Download IE virtual machines](https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/#downloads) for VMWare.
* Open VMWare and go to Window > Virtual Machine Library. Unzip the virtual machine and drag the .vmx file into your Virtual Machine Library.
* Right-click on the virtual machine you just added to your library and select "Snapshots...", and then click the "Take" button in the modal that opens. You can roll back to this snapshot when the VM expires in 90 days.
* In System Preferences > Sharing, change your computer name to be something simple, e.g. "computer".
* Run Kibana with `yarn start --host=computer.local` (substituting your computer name).
* Now you can run your VM, open the browser, and navigate to `http://computer.local:5601` to test Kibana.
* Alternatively you can use browserstack

#### Running Browser Automation Tests

[Read about the `FunctionalTestRunner`](https://www.elastic.co/guide/en/kibana/current/development-functional-tests.html) to learn more about how you can run and develop functional tests for Kibana core and plugins.

You can also look into the [Scripts README.md](./scripts/README.md) to learn more about using the node scripts we provide for building Kibana, running integration tests, and starting up Kibana and Elasticsearch while you develop.

### Building OS packages

Packages are built using fpm, dpkg, and rpm.  Package building has only been tested on Linux and is not supported on any other platform.

```bash
apt-get install ruby-dev rpm
gem install fpm -v 1.5.0
yarn build --skip-archives
```

To specify a package to build you can add `rpm` or `deb` as an argument.

```bash
yarn build --rpm
```

Distributable packages can be found in `target/` after the build completes.

### Writing documentation

Kibana documentation is written in [asciidoc](http://asciidoc.org/) format in
the `docs/` directory.

To build the docs, you must clone the [elastic/docs](https://github.com/elastic/docs)
repo as a sibling of your kibana repo. Follow the instructions in that project's
README for getting the docs tooling set up.

**To build the docs and open them in your browser:**

```bash
node scripts/docs.js --open
```

### Release Notes Process

Part of this process only applies to maintainers, since it requires access to GitHub labels.

Kibana publishes major, minor and patch releases periodically through the year. During this process we run a script against this repo to collect the applicable PRs against that release and generate [Release Notes](https://www.elastic.co/guide/en/kibana/current/release-notes.html).
To include your change in the Release Notes:

1. In the title, summarize what the PR accomplishes in language that is meaningful to the user.  In general, use present tense (for example, Adds, Fixes) in sentence case.
2. Label the PR with the targeted version (ex: `v7.3.0`).
3. Label the PR with the appropriate GitHub labels:
    * For a new feature or functionality, use `release_note:enhancement`.
    * For an external-facing fix, use `release_note:fix`. Exception: docs, build, and test fixes do not go in the Release Notes. Neither fixes for issues that were only on `master` and never have been released.
    * For a deprecated feature, use `release_note:deprecation`.
    * For a breaking change, use `release_note:breaking`.
    * To **NOT** include your changes in the Release Notes, please use `release_note:skip`.

We also produce a blog post that details more important breaking API changes every minor and major release. If the PR includes a breaking API change, apply the label `release_note:dev_docs`. Additionally add a brief summary of the break at the bottom of the PR using the format below:

```
# Dev Docs

## Name the feature with the break (ex: Visualize Loader)

Summary of the change. Anything Under `#Dev Docs` will be used in the blog.
```

## Signing the contributor license agreement

Please make sure you have signed the [Contributor License Agreement](http://www.elastic.co/contributor-agreement/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.

## Submitting a Pull Request

Push your local changes to your forked copy of the repository and submit a Pull Request. In the Pull Request, describe what your changes do and mention the number of the issue where discussion has taken place, e.g., “Closes #123″.

Always submit your pull against `master` unless the bug is only present in an older version. If the bug affects both `master` and another branch say so in your pull.

Then sit back and wait. There will probably be discussion about the Pull Request and, if any changes are needed, we'll work with you to get your Pull Request merged into Kibana.

## Code Reviewing

After a pull is submitted, it needs to get to review. If you have commit permission on the Kibana repo you will probably perform these steps while submitting your Pull Request. If not, a member of the Elastic organization will do them for you, though you can help by suggesting a reviewer for your changes if you've interacted with someone while working on the issue.

### Getting to the Code Review Stage

1. Assign the `review` label. This signals to the team that someone needs to give this attention.
1. Do **not** assign a version label. Someone from Elastic staff will assign a version label, if necessary, when your Pull Request is ready to be merged.
1. Find someone to review your pull. Don't just pick any yahoo, pick the right person. The right person might be the original reporter of the issue, but it might also be the person most familiar with the code you've changed. If neither of those things apply, or your change is small in scope, try to find someone on the Kibana team without a ton of existing reviews on their plate. As a rule, most pulls will require 2 reviewers, but the first reviewer will pick the 2nd.

### Reviewing Pull Requests

So, you've been assigned a pull to review. Check out our [pull request review guidelines](https://www.elastic.co/guide/en/kibana/master/pr-review.html) for our general philosophy for pull request reviewers.

Thank you so much for reading our guidelines! :tada:
