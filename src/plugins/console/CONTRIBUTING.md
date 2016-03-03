Contributing to Sense
=============================

Sense is an open source project and we love to receive contributions from our community — you!

Contributing to the project can be done in many ways - by taking the time to write a concise bug report, suggesting
a new feature or writing code which can then be offered via a PR.

Bug reports
-----------

If you think you have found a bug, please take a few minutes to collect some information:

1. What Sense & Kibana versions are you using?
2. What Elasticsearch version was Sense pointing at?
3. Sense pulls information like mapping and indexes and incorporates it into its suggestions.
Please gist and link any information that is relevant to reproduce the bug.

Contributing code
-----------------

If you have a bugfix or new feature that you would like to contribute to Sense, please find or open
an issue about it first. Talk about what you would like to do. It may be that somebody is already working on it,
or that there are particular issues that you should know about before implementing the change.

When you are ready to start coding, here are a set of steps to follow:

### Fork the Sense repository

You will need to fork the main Sense repository and clone it to your local machine. See
[github help page](https://help.github.com/articles/fork-a-repo) for help.

### Setup a Kibana development environment

Sense is a Kibana app. Production Kibana is geared towards performance will pre-optimize and cache code.
Setting up the development environment will change this behavior and reload your changes as you make them.

Follow the instruction described on the [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#development-environment-setup).


### Setup a Sense development environment

Once Kibana is setup, make sure your have the 4.2 branch checkout:

```sh
git checkout 4.2
```

Next, clone your Sense fork into it's `installedPlugin` folder:

```sh
git clone git@github.com:YOUR_GITHUB_HANDLE/sense.git installedPlugins/sense
```

Create a file named `config/kibana.dev.yml` (under the Kibana *root folder*), with the following content:

```yaml
kibana.enabled: false  # do not load the Discover, Visualize and Dashboard tabs of Kibana. This saves time
elasticsearch.enabled: false # do not require an active Elasticsearch instance to run
optimize:
  sourceMaps: '#cheap-module-source-map'
  unsafeCache: true
  lazyPrebuild: false
```

last, run Kibana in development mode:

```sh
./bin/kibana --dev
```

Congratulations, you should have Sense up and running now.
You can check that by pointing your browser at http://localhost:5601/app/sense/

### Linting your code

Sense uses the fantastic [eslint](http://eslint.org) tool to detect common programming errors and to enforce a uniform code style. To check your code with the linter simply run the lint script in your terminal:

```sh
npm run lint
```

Eslint also has plugins for most text editors and IDEs so that you can get linting results as you work. Here are some hints for getting eslint setup in your favorite editor:

| Editor | Plugin |
| --- | --- | --- |
| Sublime | [SublimeLinter-eslint](https://github.com/roadhump/SublimeLinter-eslint#installation) |
| Atom | [linter-eslint](https://github.com/AtomLinter/linter-eslint#installation) |
| IntelliJ | Settings » Languages & Frameworks » JavaScript » Code Quality Tools » ESLint |
| vi | [scrooloose/syntastic](https://github.com/scrooloose/syntastic) |

### Submitting your changes

Once your changes and tests are ready to submit for review:

1. Test your changes

2. Sign the Contributor License Agreement

    Please make sure you have signed our [Contributor License Agreement](https://www.elastic.co/contributor-agreement/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.

3. Rebase your changes

    Update your local repository with the most recent code from the main Sense repository,
    and rebase your branch on top of the latest master branch. We prefer your initial changes to be squashed
    into a single commit. Later, if we ask you to make changes, add them as separate commits.
    This makes them easier to review.
    As a final step before merging we will either ask you to squash all commits yourself or we'll do it for you.

4. Submit a pull request

    Push your local changes to your forked copy of the repository and [submit a pull request](https://help.github.com/articles/using-pull-requests).
    In the pull request, choose a title which sums up the changes that you have made, and in the body provide
    more details about what your changes do. Also mention the number of the issue where discussion has taken
    place, eg "Closes #123".

Then sit back and wait. There will probably be discussion about the pull request and, if any changes are needed,
we would love to work with you to get your pull request merged into Sense.
