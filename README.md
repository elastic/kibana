# backport

[![Build Status](https://travis-ci.org/sqren/backport.svg?branch=master)](https://travis-ci.org/sqren/backport)
[![NPM version](https://img.shields.io/npm/v/backport.svg)](https://www.npmjs.com/package/backport)
[![dependencies Status](https://david-dm.org/sqren/backport/status.svg)](https://david-dm.org/sqren/backport)
[![Coverage Status](https://coveralls.io/repos/github/sqren/backport/badge.svg?branch=master)](https://coveralls.io/github/sqren/backport?branch=master)

A simple CLI tool that automates the process of backporting commits

![Demonstration gif](https://i.makeagif.com/media/10-05-2017/kEJLqe.gif)

## What is backporting?

> Backporting is the action of taking parts from a newer version of a software system [..] and porting them to an older version of the same software. It forms part of the maintenance step in a software development process, and it is commonly used for fixing security issues in older versions of the software and also for providing new features to older versions.

Source: [https://en.wikipedia.org/wiki/Backporting](https://en.wikipedia.org/wiki/Backporting)

## Who is this tool for?

If your development workflow looks something like this:

1.  Write some code, merge those changes to master (eg. using a pull request)
2.  Cherry-pick one or more commits from master onto one or more branches
3.  Push those branches and a create new backport pull requests

Then `backport` might save you a lot of time and effort. The CLI will ask you which commit to backport, and to which branch and the cherry-pick the commit, and create a pull request towards the correct branch.

## Requirements

- Node 8 or higher

## Install

```
npm install -g backport
```

After installation you must update the global config in `~/.backport/config` with your Github username and a Github access token. More info [here](https://github.com/sqren/backport/blob/master/docs/getting-started.md#new-user-create-user-config)

## Usage

Run the CLI in your project folder (eg. in the Kibana folder):

```
$ backport
```

Follow the steps. You can use the `arrow keys` to choose options, `<space>` to select checkboxes and `<enter>` to proceed.

### Options

| Option        | Description                               | Accepts                  |
| ------------- | ----------------------------------------- | ------------------------ |
| --all         | Show all commits                          | boolean (default: false) |
| --branch      | Branch to backport                        | array (default: [])      |
| --multiple    | Backport multiple commits and/or branches | boolean                  |
| --upstream    | Name of repository                        | string                   |
| --sha         | Commit sha to backport                    | string                   |
| --help        | Show help                                 |                          |
| -v, --version | Show version number                       |                          |

### Documentation

- [Getting started guide](https://github.com/sqren/backport/blob/master/docs/getting-started.md)
- [Configuration options](https://github.com/sqren/backport/blob/master/docs/configuration.md)

## Contributing

**Run from source**

```
npx ts-node ./src/cli/index.ts --branch 6.1 --upstream sqren/backport-demo --all
```

**Run from build**

```
node dist/cli/index.js --branch 6.1 --upstream sqren/backport-demo --all
```

**Compile typecscript**

```
yarn build
```

**Test**

```
yarn test
```
