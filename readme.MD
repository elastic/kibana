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
| --multiple          | Backport multiple commits and/or versions | boolean                     |
| --multiple-commits  | Backport multiple commits                 | boolean (defaults to false) |
| --multiple-versions | Backport to multiple versions             | boolean (defaults to true)  |
| --sha               | Supply a commit sha to backport           | string                      |
| --own               | Only show own commits                     | boolean (defaults to true)  |
| --config            | Show configuration file                   |                             |
| --help              | Show help                                 |                             |
| -v, --version       | Show version number                       |                             |

### Configuration

The first time you run `backport` a skeleton configuration file will be created
in `/<homedir>/.backport/config.json`. You need to update the config file with
your Github username and a Github Access Token (can be created
[here](https://github.com/settings/tokens/new)).

<details>
<summary>View config sample</summary>

```js
{
  // Github personal access token. Create here: https://github.com/settings/tokens/new
  // Please check "Full control of private repositories"
  "accessToken": "",

  // Github username, eg. kimchy
  "username": "",

  // Only allow picking own commits to backport
  "own": true,

  // Backport multiple commits
  "multipleCommits": false,

  // Backport to multiple versions
  "multipleVersions": true,

  // Repositories and the versions that will be available in backport cli
  "repositories": [
    {
      "name": "elastic/elasticsearch",
      "versions": ["6.x", "6.1", "6.0"]
    },
    {
      "name": "elastic/kibana",

      // You can pre-select versions you use often
      "versions": [
        { "name": "6.x", "checked": true },
        { "name": "6.1", "checked": true },
        "6.0"
      ]
      "labels": ["backport"]
    }
  ]
}
```

</details>

### Troubleshooting

`backport` never touches your local repositories or files. Instead a separate
clone of your repositories are created in `/<homedir>/.backport/repositories/`.
This is also where you'll need to solve merge conflicts. If you are experiencing
issues, you can try deleting the repository, or the entire `.backport` folder -
it will be recreated next time you run `backport`.
