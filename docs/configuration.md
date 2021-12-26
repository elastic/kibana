# Configuration

`backport` reads options from two configuration files:

- [Global config](#global-config-backportconfigjson)
- [Project config](#project-config-backportrcjson)

All config options can additionally be overriden via CLI options.

## Global config (`.backport/config.json`)

During installation `backport` will create an empty configuration file in `~/.backport/config.json`. You must update this file with your Github username and a [Github Access Token](https://github.com/settings/tokens/new)

Example:

```json
{
  "accessToken": "b4914600112ba18af7798b6c1a1363728ae1d96f",
  "username": "sqren"
}
```

#### `accessToken` **required**

Personal access token.
Access tokens can be created here: https://github.com/settings/tokens/new

Please select the necessary access scopes:

**For public and private repos (recommended)**
![image](https://user-images.githubusercontent.com/209966/67081197-fe93d380-f196-11e9-8891-c6ba8c4686a4.png)

**For public repos only**
![image](https://user-images.githubusercontent.com/209966/67081207-018ec400-f197-11e9-86aa-4ae4a003fcbd.png)

CLI: `--accessToken myAccessToken`

#### `username` **required**

Github username

CLI: `--username sqren`

#### `editor`

If a conflicts occurs your editor of choice will be opened to make it easier for you to resolve the conflict

CLI: `--editor code`

Config:

```json
{
  "editor": "code"
}
```

## Project config (`.backportrc.json`)

A `.backportrc.json` config file should be added to the root of each project where `backport` is used. This is useful for sharing configuration options with other project contributors.

Example:

```json
{
  "upstream": "elastic/kibana",
  "targetBranchChoices": [
    { "name": "6.x", "checked": true },
    "6.3",
    "6.2",
    "6.1",
    "6.0"
  ],
  "targetPRLabels": ["backport"]
}
```

#### `upstream` **required**

Github organization/user and repository name separated with forward slash.

CLI: `--upstream elastic/kibana`

Config:

```json
{
  "upsteam": "elastic/kibana"
}
```

#### `targetBranchChoices` **required**

List of target branches the user can select interactively. The array can contain branch names as strings or objects that also contains the field `checked` which indicates whether the branch should be pre-selected. It is useful to pre-select branches you often backport to.

CLI: `target-branch-choice <branch>`

Config:

```json
{
  "targetBranchChoices": [
    { "name": "6.x", "checked": true },
    "6.3",
    "6.2",
    "6.1",
    "6.0"
  ]
}
```

## General configuration options

The following options can be used in both the global config, project config, and passed in through CLI.

#### `all`

`true`: list all commits

`false`: list commits by you only

Default: `false`

CLI: `--all`, `-a`

#### `assignees`

Add assignees to the target pull request

CLI: `--assignee <username>`, `--assign <username>`

Config:

```json
{
  "assignees": ["sqren"]
}
```

#### `autoAssign`

Automatically add the current user as assignee to the target pull request

CLI: `--auto-assign`

Config:

```json
{
  "autoAssign": true
}
```

#### `branchLabelMapping`

Pre-select target branch choices based on the source PR labels.

CLI: N/A

Config:

```json
{
  "branchLabelMapping": {
    "^v7.8.0$": "7.x",
    "^v(\\d+).(\\d+).\\d+$": "$1.$2"
  }
}
```

_Note: backslashes must be escaped._

#### `fork`

`true`: Create backport branch in users own fork

`false`: Create backport branch in the origin repository

Default: `true`

CLI: `--fork=false`

Config:

```json
{
  "fork": false
}
```

#### `gitHostname`

Hostname for Github.

Default: `github.com`

CLI: `--git-hostname "github.my-private-company.com"`

Config:

```json
{
  "gitHostname": "github.my-private-company.com"
}
```

#### `githubApiBaseUrlV3`

Base url for Github's REST (v3) API

Default: `https://api.github.com`

CLI: `--github-api-base-url-v3 "https://api.github.my-private-company.com"`

Config:

```json
{
  "githubApiBaseUrlV3": "https://api.github.my-private-company.com"
}
```

#### `githubApiBaseUrlV4`

Base url for Github's GraphQL (v4) API

Default: `https://api.github.com/graphql`

CLI: `--github-api-base-url-v4 "https://github-enterprise.acme-inc.com/api"`

Config:

```json
{
  "githubApiBaseUrlV4": "https://github-enterprise.acme-inc.com/api"
}
```

#### `mainline`

When backporting a merge commit the parent id must be specified. This is directly passed to `git cherry-pick` and additional details can be read on the [Git Docs](https://git-scm.com/docs/git-cherry-pick#Documentation/git-cherry-pick.txt---mainlineparent-number)

**Examples:**

- Defaults to 1 when no parent id is given: `backport --mainline`
- Specifying parent id: `backport --mainline 2`

#### maxNumber

Number of commits that will be listed for the user to choose from.

Default: 10

CLI: `--max-number <number>`, `--number <number>`, `-n <number>`

Config:

```json
{
  "maxNumber": 20
}
```

#### `multipleCommits`

`true`: you will be able to select multiple commits to backport. You will use `<space>` to select, and `<enter>` to confirm you selection.

`false`: you will only be able to select a single commit. You will use `<enter>` to confirm the selected item.

Default: `false`

#### `multipleBranches`

`true`: you will be able to select multiple branches to backport to. You will use `<space>` to select, and <enter> to confirm you selection.

`false`: you will only be able to select a single branch. You will use `<enter>` to confirm the selected item.

Default: `true`

#### commitPaths

Only list commits touching files under the specified path

CLI: `--path <path>`, `-p <path>`

Config:

```json
{
  "commitPaths": ["my/folder"]
}
```

#### `prTitle`

Title for the target pull request
Template values:

- `{targetBranch}`: Branch the backport PR will be targeting
- `{commitMessages}`: Message of backported commit. For multiple commits the messages will be separated by pipes (`|`).

Default: `"[{targetBranch}] {commitMessages}"`

CLI: `--pr-title "<title>"`, `--title "<title>"`

Config:

```json
{
  "prTitle": "{commitMessages} backport for {targetBranch}"
}
```

#### `prDescription`

Text that will be appended to the description of the target pull request

For people who often need to add the same description to PRs they can create a bash alias:

```sh
alias backport-skip-ci='backport --prDescription "[skip-ci]"'
```

CLI: `--pr-description "<text>"`, `--description "<text>"`

Config:

```json
{
  "prDescription": "skip-ci"
}
```

#### `prFilter`

Filter source pull requests by any [Github query](https://help.github.com/en/github/searching-for-information-on-github/understanding-the-search-syntax). Text with whitespace [must contain escaped quotes](https://help.github.com/en/github/searching-for-information-on-github/understanding-the-search-syntax#use-quotation-marks-for-queries-with-whitespace).

CLI: `--pr-filter "<query>"`

Config:

```json
{
  "prFilter": "label: \"Backport Needed\""
}
```

#### `pullNumber`

Backport a pull request by specifying its number

CLI: `--pull-number "<number>"`, `--pr "<number>"`

#### `resetAuthor`

Change the author of the backported commit to the current user

CLI: `--reset-author`

#### `reviewers`

Add reviewers to the target pull request

CLI: `--reviewer`

#### `sha`

Backport a commit by specifying its commit sha

CLI: `--sha "<sha>"`, `--commit "<sha>"`

#### `sourceBranch`

By default the list of commits will be sourced from the repository's default branch (mostly "master"). Use `sourceBranch` to list and backport commits from other branches than the default.

Default: master (unless the default branch on Github is changed)

CLI: `--source-branch 7.x`

Config:

```json
{
  "sourceBranch": "7.x"
}
```

#### `sourcePRLabels`

Labels that will be added to the source (original) pull request. This can be useful if you, at a later time, want to find the PRs that were already backported.

CLI: `--source-pr-label <label>`

Config:

```json
{
  "sourcePRLabels": ["was-backported"]
}
```

#### `targetBranches`

Overrides `targetBranchChoices` so instead of displaying a prompt with target branches to choose from, the selected commit(s) will be backported directly to the branches defined in `targetBranches`

CLI: `--target-branch <branch>`, `--branch <branch>`, `-b <branch>`

Config:

```json
{
  "targetBranches": ["7.x", "7.7"]
}
```

#### `targetPRLabels`

Labels that will be added to the target (backport) pull request. This can be useful if you, at a later time, want to find the backport PRs.

CLI: `--target-pr-label <label>`, `-l <label>`

Config:

```json
{
  "targetPRLabels": ["backport", "apm-team"]
}
```
