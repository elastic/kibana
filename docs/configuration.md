# Configuration

`backport` reads options from two configuration files:

- [Global config](#global-config-backportconfigjson)
- [Project config](#project-config-backportrcjson)

All config options can additionally be provided and/or overriden via CLI options.

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

## Project config (`.backportrc.json`)

A `.backportrc.json` config file should be added to the root of each project where `backport` is used. This is useful for sharing configuration options with other project contributors.

Example:

```json
{
  "upstream": "elastic/kibana",
  "branches": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"],
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

#### `branches` **required**

List of branches that will be available to backport to. The array can contain branch names as strings or objects that also contains the field `checked` which indicates whether the branch should be pre-selected. It is useful to pre-select branches you often backport to.

CLI: `--branch 6.1 --branch 6.0`

Config:

```json
{
  "branches": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"]
}
```

#### `all`

`true`: list all commits

`false`: list commits by you only

Default: `false`

CLI: `--all`

#### `branchLabelMapping`

Pre-select branch options based on labels on the source PR.

Example:

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

#### `githubApiBaseUrlV3`

Base url for Github's REST (v3) API

Default: `https://api.github.com`

CLI: `--github-api-base-url-v3 "https://api.github.my-private-company.com"`

#### `githubApiBaseUrlV4`

Base url for Github's GraphQL (v4) API

Default: `https://api.github.com/graphql`

CLI: `--github-api-base-url-v4 "https://github-enterprise.acme-inc.com/api"`

#### `mainline`

When backporting a merge commit the parent id must be specified. This is directly passed to `git cherry-pick` and additional details can be read on the [Git Docs](https://git-scm.com/docs/git-cherry-pick#Documentation/git-cherry-pick.txt---mainlineparent-number)

**Examples:**

- Defaults to 1 when no parent id is given: `backport --mainline`
- Specifying parent id: `backport --mainline 2`

#### `multipleCommits`

`true`: you will be able to select multiple commits to backport. You will use `<space>` to select, and `<enter>` to confirm you selection.

`false`: you will only be able to select a single commit. You will use `<enter>` to confirm the selected item.

Default: `false`

#### `multipleBranches`

`true`: you will be able to select multiple branches to backport to. You will use `<space>` to select, and <enter> to confirm you selection.

`false`: you will only be able to select a single branch. You will use `<enter>` to confirm the selected item.

Default: `true`

#### `prTitle`

Pull request title pattern.
Template values:

- `{targetBranch}`: Branch the backport PR will be targeting
- `{commitMessages}`: Multiple commits will be concatenated and separated by pipes (`|`).

Default: `"[{targetBranch}] {commitMessages}"`

CLI: `--pr-title "{commitMessages} backport for {targetBranch}"`

Config:

```json
{
  "prTitle": "{commitMessages} backport for {targetBranch}"
}
```

#### `prDescription`

Text that will be appended to the pull request description.

For people who often need to add the same description to PRs they can create a bash alias:

```sh
alias backport-skip-ci='backport --prDescription "[skip-ci]"'
```

CLI: `--pr-description "skip-ci"`

Config:

```json
{
  "prDescription": "skip-ci"
}
```

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

Labels that will be added to the source (original) pull request. This can be useful if you, at a later time, want to filter for PRs that were already backported.

CLI: `--source-labels backport --source-labels apm-team`

Config:

```json
{
  "sourcePRLabels": ["was-backported"]
}
```

#### `targetPRLabels`

Labels that will be added to the target (backport) pull request. This can be useful if you, at a later time, want to filter for backport PRs.

CLI: `--labels backport --labels apm-team`

Config:

```json
{
  "targetPRLabels": ["backport", "apm-team"]
}
```
