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

This tools is for anybody who is working on a codebase where they have to maintain multiple versions. If you manually cherry-pick commits from master and apply them to one or more branches, this tool might save you a lot of time.

`backport` is a CLI that will ask you which commit(s) to backport and to which branch(es) and then cherry-pick accordingly, and create pull requests. It will always perform the git operation in a temporary folder (`~/.backport/repositories/`) separate from your working directory, thus never interfering with any unstages changes your might have.

## Requirements

- Node 8 or higher
- git

OR

- Docker

## Install with Node (recommended)

```
npm install -g backport
```

After installation you should update the [global config](https://github.com/sqren/backport/blob/master/docs/configuration.md#global-config-backportconfigjson) in `~/.backport/config.json` with your Github username and a Github access token.

## Run via Docker

If you don't have Node.js or git installed locally, you can run `backport` via Docker.

<details>
  <summary>Click to expand</summary>
The easiest way is to add the following snippet to your bash profile:

```sh
backport() {
    BACKPORT_CONFIG_DIR=~/.backport
    GIT_CONFIG_FILE=~/.gitconfig

    docker run -it --rm -v $(pwd):/app:ro -v $BACKPORT_CONFIG_DIR:/root/.backport -v $GIT_CONFIG_FILE:/etc/gitconfig sqren/backport "$@"
}
```

Where:

- `BACKPORT_CONFIG_DIR`: This can be ANY empty folder on your local machine. Upon running the docker container for the first time, a [`config.json`](https://github.com/sqren/backport/blob/master/docs/configuration.md#global-config-backportconfigjson) will be created automatically. This must be filled out with `username` and `accessToken` or these must be passed as CLI arguments: `backport --username <username> --accessToken <accessToken>`
- `GIT_CONFIG_FILE`: Must point to a local [`.gitconfig`](https://gist.github.com/sqren/618ab2f77ffb8b5388d675fe705ed6da) file that contains the user's name and email.

You can now use `backport` as if it was installed on the host machine.
</details>

## Usage

Run the CLI in your project folder (must contain a [`.backportrc.json`](https://github.com/sqren/backport/blob/master/docs/configuration.md#project-config-backportrcjson) file):

```
> backport
```

or run this from anywhere:

```
> backport --upstream elastic/kibana
```

The above commands will start an interactive prompt. You can use the `arrow keys` to choose options, `<space>` to select checkboxes and `<enter>` to proceed.

### CLI Arguments

| Option          | Description                               | Accepts                  |
| --------------- | ----------------------------------------- | ------------------------ |
| --accessToken   | Github access token                       | string                   |
| --all           | Show all commits                          | boolean (default: false) |
| --branch        | Branch to backport to                     | string                   |
| --labels        | Pull request labels                       | string                   |
| --multiple      | Backport multiple commits and/or branches | boolean                  |
| --prDescription | Description to be added to pull request   | string                   |
| --prTitle       | Title for the pull request                | string                   |
| --sha           | Commit sha to backport                    | string                   |
| --upstream      | Name of repository                        | string                   |
| --username      | Github username                           | string                   |
| --help          | Show help                                 |                          |
| -v, --version   | Show version number                       |                          |

### Additional documentation

- [Configuration options](https://github.com/sqren/backport/blob/master/docs/configuration.md)

## Contributing

See [CONTRIBUTING.md](https://github.com/sqren/backport/blob/master/CONTRIBUTING.md)
