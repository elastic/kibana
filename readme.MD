# backport

[![Build Status](https://travis-ci.org/sqren/backport.svg?branch=master)](https://travis-ci.org/sqren/backport)
[![dependencies Status](https://david-dm.org/sqren/backport/status.svg)](https://david-dm.org/sqren/backport)
[![Maintainability](https://api.codeclimate.com/v1/badges/42a56ac121367ec37d19/maintainability)](https://codeclimate.com/github/sqren/backport/maintainability)
[![NPM version](https://img.shields.io/npm/v/backport.svg)](https://www.npmjs.com/package/backport)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](#badge)

A simple CLI tool for backporting commits

![Demonstration gif](https://i.makeagif.com/media/10-05-2017/kEJLqe.gif)

### Install

```
npm install -g backport
```

### Usage

```
> backport
```

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

### Configuration

#### Global Config

The first time you run `backport` a skeleton configuration file will be created
in `/<homedir>/.backport/config.json`. You need to update the config file with
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

#### Project-specific config

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
  ]

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

### Troubleshooting

`backport` never touches your local repositories or files. Instead a separate
clone of your repositories are created in `/<homedir>/.backport/repositories/`.
This is also where you'll need to solve merge conflicts. If you are experiencing
issues, you can try deleting the repository, or the entire `.backport` folder -
it will be recreated next time you run `backport`.
