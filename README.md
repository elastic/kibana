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
1.  Cherry-pick one or more commits from master onto one or more branches
1.  Push those branches and a create new backport pull requests

Then `backport` might save you a lot of time and effort.

The CLI will ask you a few questions and then do those steps for you. You can even save a configuration with your preferences to make the process even more automated. See below for instructions on how to use and configure it.

## Requirements

* Node 8 or higher

## Install

```
npm install -g backport
```

After installation you must update [the global config](#global-configuration) with your Github username and a Github access token.

## Usage

Run the CLI in your project folder (eg. in the Kibana folder):

```
$ backport
```

Follow the steps. You can use the `arrow keys` to choose options, `<space>` to select checkboxes and `<enter>` to proceed.

### Options

| Option              | Description                               | Accepts                     |
| ------------------- | ----------------------------------------- | --------------------------- |
| --multiple          | Backport multiple commits and/or branches | boolean                     |
| --multiple-commits  | Backport multiple commits                 | boolean (defaults to false) |
| --multiple-branches | Backport to multiple branches             | boolean (defaults to true)  |
| --own               | Only show own commits                     | boolean (defaults to true)  |
| --show-config       | Show configuration                        |                             |
| --sha               | Commit sha to backport                    | string                      |
| --help              | Show help                                 |                             |
| -v, --version       | Show version number                       |                             |

## Configuration

### Global configuration

During installation `backport` will create an empty configuration file in `~/.backport/config.json`. You must update this file with your Github username and a [Github Access Token](https://github.com/settings/tokens/new)

Example:

```json
{
  "accessToken": "b4914600112ba18af7798b6c1a1363728ae1d96f",
  "username": "sqren"
}
```

##### `accessToken` (string) **required**

A personal access token can be created here: https://github.com/settings/tokens/new

Access scopes:

* Private repository: "Repo (Full control of private repositories)"
* Public repository: "public_repo (Access public repositories)"

<img width="578" alt="Github Personal Access Token scopes for private repositories" src="https://user-images.githubusercontent.com/209966/35889278-3527877c-0b9b-11e8-8815-0d23899e872c.png">

##### `username` (string) **required**

Your Github username

##### `projects` (object[])

A list of project-specific settings. This is useful if you want to override project-specific configurations.
[Read more about the project-specific configuration](#project-specific-configuration)

The `upstream` property will determine which project-specific config to override. The following will override `own` and `multipleCommits` for `elastic/kibana`:

```json
{
  "projects": [
    {
      "upstream": "elastic/kibana",
      "own": false,
      "multipleCommits": true
    }
  ]
}
```

### Project-specific configuration

`.backportrc.json` can be added to every project where you use `backport`. This is useful for sharing configuration options with other project contributors.

Example:

```json
{
  "upstream": "elastic/kibana",
  "branches": [{ "name": "6.x", "checked": true }, "6.0"],
  "own": true,
  "multipleCommits": false,
  "multipleBranches": true,
  "labels": ["backport"]
}
```

##### `upstream` (string) **required**

Github organization/user and repository name separated with forward slash.

##### `branches` (string[] | object[])

List of branches that will be available to backport to. The list can contain string and objects. If a string is given, it must be the name of a branch, if an object is given it must use the format `{"name": "<string>", "checked": <boolean>}` where `name` is the branch name and `"checked"` indicates whether the branch should be auto-selected. It is useful to auto-select branches you often backport to.

##### `own` (boolean)

`true`: only commits by you will be available to backport.

`false`: all commits in the repository will be displayed.

Default: `true`

##### `multipleCommits` (boolean)

`true`: you will be able to select multiple commits to backport. You will use `<space>` to select, and `<enter>` to confirm you selection.

`false`: you will only be able to select a single commit. You will use `<enter>` to confirm the selected item.

Default: `false`

##### `multipleBranches` (boolean)

`true`: you will be able to select multiple branches to backport to. You will use `<space>` to select, and <enter> to confirm you selection.

`false`: you will only be able to select a single branch. You will use `<enter>` to confirm the selected item.

Default: `true`

##### `labels` (string[])

List of labels that will be added to the backport pull request. These are often useful if you want to filter for backport PRs

## Troubleshooting

`backport` never touches your local repositories or files. Instead a separate
clone of your repositories are created in `~/.backport/repositories/`.
This is also where you'll need to solve merge conflicts. If you are experiencing
issues, you can try deleting the repository, or the entire `.backport` folder -
it will be recreated next time you run `backport`.
