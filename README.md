# backport

[![Build Status](https://travis-ci.org/sqren/backport.svg?branch=master)](https://travis-ci.org/sqren/backport)
[![dependencies Status](https://david-dm.org/sqren/backport/status.svg)](https://david-dm.org/sqren/backport)
[![Coverage Status](https://coveralls.io/repos/github/sqren/backport/badge.svg?branch=master)](https://coveralls.io/github/sqren/backport?branch=master)
[![NPM version](https://img.shields.io/npm/v/backport.svg)](https://www.npmjs.com/package/backport)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](#badge)

A simple CLI tool that automates the process of backporting commits

![Demonstration gif](https://i.makeagif.com/media/10-05-2017/kEJLqe.gif)

## What is backporting?

> Backporting is the action of taking parts from a newer version of a software system [..] and porting them to an older version of the same software. It forms part of the maintenance step in a software development process, and it is commonly used for fixing security issues in older versions of the software and also for providing new features to older versions.

Source: [https://en.wikipedia.org/wiki/Backporting](https://en.wikipedia.org/wiki/Backporting)


## Who is this tool for?

If your development workflow looks something like this:

1. Write some code, merge those changes to master (eg. using a pull request)
1. Cherry-pick one or more commits from master onto one or more branches
1. Push those branches and a create new backport pull requests

Then `backport` might save you a lot of time and effort. 

The CLI will ask you a few questions and then do those steps for you. You can even save a configuration with your preferences to make the process even more automated. See below for instructions on how to use and configure it.

## Install

```
npm install -g backport
```

## Usage

Run the CLI in your project folder:

```
$ backport
```

Follow the steps. You can use the `arrow keys` to choose options and `Enter` to select.

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

The first time you run `backport` a sample configuration file will be created
in `~/.backport/config.json`. You need to update the config file with
your Github username and a Github Access Token (can be created
[here](https://github.com/settings/tokens/new)).

<details>
<summary>View "config.json" sample</summary>

```js
{
  // Github personal access token. Create here: https://github.com/settings/tokens/new
  // Please check "Full control of private repositories"
  "accessToken": "",

  // Github username, eg. kimchy
  "username": "",

  // Override project-specific setting
  "projects": [
    {
      "upstream": "elastic/kibana",
      "branches": ["6.x", "6.1", "6.0"]
    }
  ]
}
```

</details>

### Project-specific configuration

Add `.backportrc.json` to the root of your project with the following structure:

<details>
<summary>View ".backportrc.json" sample</summary>

```js
{
  "upstream": "elastic/kibana",

  // You can pre-select branches you use often
  "branches": [
    { "name": "6.x", "checked": true },
    { "name": "6.1", "checked": true },
    "6.0"
  ],

  // Only allow picking own commits to backport
  "own": true,

  // Backport multiple commits
  "multipleCommits": false,

  // Backport to multiple branches
  "multipleBranches": true,

  // Labels will be added to the PR
  "labels": ["backport"]
}
```

</details>

## Troubleshooting

`backport` never touches your local repositories or files. Instead a separate
clone of your repositories are created in `~/.backport/repositories/`.
This is also where you'll need to solve merge conflicts. If you are experiencing
issues, you can try deleting the repository, or the entire `.backport` folder -
it will be recreated next time you run `backport`.
