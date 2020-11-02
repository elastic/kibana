# backport

[![Build Status](https://travis-ci.org/sqren/backport.svg?branch=master)](https://travis-ci.org/sqren/backport)
[![NPM version](https://img.shields.io/npm/v/backport.svg)](https://www.npmjs.com/package/backport)
[![dependencies Status](https://david-dm.org/sqren/backport/status.svg)](https://david-dm.org/sqren/backport)
[![Coverage Status](https://coveralls.io/repos/github/sqren/backport/badge.svg?branch=master)](https://coveralls.io/github/sqren/backport?branch=master)

A simple CLI tool that automates the process of backporting commits on a GitHub repo.

![backport-demo](https://user-images.githubusercontent.com/209966/80993576-95766380-8e3b-11ea-9efd-b35eb2e6a9ec.gif)

## Requirements

- Node 10 or higher
- git

## Install

```sh
npm install -g backport
```

After installation you should update the [global config](https://github.com/sqren/backport/blob/master/docs/configuration.md#global-config-backportconfigjson) in `~/.backport/config.json` with your Github username and a Github access token. See the [documentation](https://github.com/sqren/backport/blob/master/docs/configuration.md#accesstoken-required) for how the access token is generated.

## Quick start

Add a [project config](https://github.com/sqren/backport/blob/master/docs/configuration.md#project-config-backportrcjson) to the root of your repository:

```js
// .backportrc.json
{
  "upstream": "elastic/kibana",
  "targetBranchChoices": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"],
}
```

Install locally:

```
npm install backport
```

Run:

```
npx backport
```

_This will start an interactive prompt. You can use your keyboards arrow keys to choose options, `<space>` to select checkboxes and `<enter>` to proceed._

### Config options

See [configuration.md](https://github.com/sqren/backport/blob/master/docs/configuration.md)

### CLI options

Please note that dashes between the words are optional,for instance you can type `--targetBranchor` `--target-branch` both are valid options.

| Option              | Shorthand notation   | Description                                            | Default        | Type            |
| ------------------- | -------------------- | ------------------------------------------------------ | -------------- | --------------- |
| --access-token      | --accesstoken        | Github access token                                    |                | `string`        |
| --all               | -a                   | Show commits from other than me                        | false          | `boolean`       |
| --author            |                      | Filter commits by author                               | _Current user_ | `string`        |
| --assignees         | --assignee, --assign | Assign users to target pull request                    |                | `Array<string>` |
| --auto-assign       |                      | Assign current user to target pull request             | false          | `boolean`       |
| --branch            | --b                  | Target branch to backport to                           |                | `string`        |
| --ci                |                      | Disable interactive prompts                            | false          | `boolean`       |
| --dry-run           |                      | Perform backport without pushing to Github             | false          | `string`        |
| --editor            |                      | Editor (eg. `code`) to open and solve conflicts        | nano           | `string`        |
| --fork              |                      | Create backports in fork (true) or origin repo (false) | true           | `boolean`       |
| --git-hostname      |                      | Hostname for Git                                       | github.com     | `string`        |
| --mainline          |                      | Parent id of merge commit                              | 1              | `number`        |
| --max-number        | --number, --n        | Number of commits to choose from                       | 10             | `number`        |
| --multiple          |                      | Select multiple commits/branches                       | false          | `boolean`       |
| --multiple-branches |                      | Backport to multiple branches                          | true           | `boolean`       |
| --multiple-commits  |                      | Backport multiple commits                              | false          | `boolean`       |
| --path              | -p                   | Only list commits touching files under a specific path |                | `string`        |
| --pull-number       | --pr                 | Pull request to backport                               |                | `number`        |
| --pr-description    | --description        | Pull request description suffix                        |                | `string`        |
| --pr-filter         |                      | List commits from PRs filtered by a given query        |                | `string`        |
| --pr-title          | --title              | Title of pull request                                  |                | `string`        |
| --reset-author      |                      | Set yourself as commit author                          |                | `boolean`       |
| --sha               |                      | Sha of commit to backport                              |                | `string`        |
| --source-branch     |                      | Specify a non-default branch to backport from          |                | `string`        |
| --source-pr-labels  | --sourcePRLabel      | Labels added to the source PR                          |                | `array<string>` |
| --target-pr-Labels  | --labels, --label    | Labels added to the target PR                          |                | `array<string>` |
| --target-branches   | --b, --targetBranch  | Target branch(es) to backport to                       |                | `array<string>` |
| --upstream          | --up                 | Name of organization and repository                    |                | `string`        |
| --username          |                      | Github username                                        |                | `string`        |
| --help              |                      | Show help                                              |                |                 |
| -v, --version       |                      | Show version number                                    |                |                 |

The CLI options will override the [configuration options](https://github.com/sqren/backport/blob/master/docs/configuration.md).

## What is backporting?

> Backporting is the action of taking parts from a newer version of a software system [..] and porting them to an older version of the same software. It forms part of the maintenance step in a software development process, and it is commonly used for fixing security issues in older versions of the software and also for providing new features to older versions.

Source: [https://en.wikipedia.org/wiki/Backporting](https://en.wikipedia.org/wiki/Backporting)

## Who is this tool for?

This tools is for anybody who is working on a codebase where they have to maintain multiple versions. If you manually cherry-pick commits from master and apply them to one or more branches, this tool might save you a lot of time.

`backport` is a CLI tool that will let you backport commit(s) interactively and then cherry-pick and create pull requests automatically. `backport` will always perform the git operation in a temporary folder (`~/.backport/repositories/`) separate from your working directory, thereby never interfering with any unstages changes your might have.

**Features:**

- interactively backport one or more commits to one or more branches with an intuitive UI
- will never run `git reset --hard` or other git commands in your working directory - all git operations are handled in a separate directory
- backport a commit by specifying a PR: `backport --pr 1337`
- list and backport commits by a particular user: `backport --author john`
- list and backport commits by a particular path: `backport --path src/plugins/chatbot`
- list PRs filtered by a query: `backport --pr-filter label:backport-v2` (will list commits from PRs with the label "backport-v2")
- forward port commits: `backport --sourceBranch 7.x --branch master` (will forwardport from 7.x to master)
- backport merge commits: `backport --mainline`
- ability to see which commits have been backported and to which branches
- customize the title, description and labels of the created backport PRs

## Contributing

See [CONTRIBUTING.md](https://github.com/sqren/backport/blob/master/CONTRIBUTING.md)
