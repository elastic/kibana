# backport

[![Build Status](https://travis-ci.org/sqren/backport-cli.svg?branch=master)](https://travis-ci.org/sqren/backport-cli)
[![Greenkeeper badge](https://badges.greenkeeper.io/sqren/backport-cli.svg)](https://greenkeeper.io/)
[![Maintainability](https://api.codeclimate.com/v1/badges/725c103c79c5ba2ec6a5/maintainability)](https://codeclimate.com/github/sqren/backport-cli/maintainability)
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

| Option | Description | Accepts |
| --- | --- | --- |
| --multiple     | Backport to multiple versions   | boolean (defaults to true) |
| --own          | Only show own commits           | boolean (defaults to true) |
| --config       | Show configuration file         |                            |
| --help         | Show help                       |                            |
| -v, --version  | Show version number             |                            |

### Configuration

The first time you run `backport` a skeleton configuration file will be created in `/<homedir>/.backport/config.json`.
You need to update the config file with your Github username and a Github Access Token (can be created [here](https://github.com/settings/tokens/new)).

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

  // Allow picking multiple versions to backporting to
  "multiple": true,

  // Repositories and the versions that will be available in backport cli
  "repositories": [
    {
      "name": "elastic/elasticsearch",
      "versions": ["6.x", "6.0", "5.6", "5.5", "5.4"]
    },
    {
      "name": "elastic/kibana",
      "versions": ["6.x", "6.0", "5.6", "5.5", "5.4"],
      "labels": ["backport"]
    }
  ]
}

```
</details>

### Troubleshooting

`backport` never touches your local repositories or files. Instead a separate clone of your repositories are created in `/<homedir>/.backport/repositories/`. This is also where you'll need to solve merge conflicts.
If you are experiencing issues, you can try deleting the repository, or the entire `.backport` folder - it will be recreated next time you run `backport`.
