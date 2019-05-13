# Configuration files

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

- `repo` (for public and private repos)
- `public_repo` (for public repos only)

CLI: `--accessToken myAccessToken`

#### `username` **required**

Github username

CLI: `--username sqren`

## Project config (`.backportrc.json`)

A `.backportrc.json` config file should be added to the root of each project where `backport` is used. This is useful for sharing configuration options with other project contributors.

Example:

```json
{
  "upstream": "elastic/kibana",
  "branches": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"],
  "labels": ["backport"]
}
```

#### `upstream` **required**

Github organization/user and repository name separated with forward slash.

Example: "elastic/kibana"

CLI: `--upstream elastic/kibana`

#### `branches` **required**

List of branches that will be available to backport to. The array can contain branch names as strings or objects that also contains the field `checked` which indicates whether the branch should be pre-selected. It is useful to pre-select branches you often backport to.

Example: `[{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"]`

CLI: `--branches 6.1 --branches 6.0`

#### `all`

`true`: list all commits

`false`: list commits by you only

Default: `false`

CLI: `--all`

#### `multipleCommits`

`true`: you will be able to select multiple commits to backport. You will use `<space>` to select, and `<enter>` to confirm you selection.

`false`: you will only be able to select a single commit. You will use `<enter>` to confirm the selected item.

Default: `false`

#### `multipleBranches`

`true`: you will be able to select multiple branches to backport to. You will use `<space>` to select, and <enter> to confirm you selection.

`false`: you will only be able to select a single branch. You will use `<enter>` to confirm the selected item.

Default: `true`

#### `labels`

Labels that will be added to the backport pull request. These are often useful if you want to filter for backport PRs.

Example: `["backport", "apm-team"]`

CLI: `--labels myLabel --labels myOtherLabel`

#### `prTitle`

Pull request title pattern. You can access the base branch (`{baseBranch}`) and commit message (`{commitMessages}`) via the special accessors in quotes.
Multiple commits will be concatenated and separated by pipes.

Example: `"{commitMessages} backport for {baseBranch}"`

Default: `"[{baseBranch}] {commitMessages}"`

CLI: `--prTitle "My PR Title"`

#### `prDescription`

Pull request description.
Will be added to the end of the pull request description.

CLI: `--prDescription "skip-ci"`

#### `gitHostname`

Hostname for Github.

Example: `github.my-private-company.com`

Default: `github.com`

CLI: `--gitHostname "github.my-private-company.com"`

#### `apiHostname`

Hostname for the Github API.

Example: `api.github.my-private-company.com`

Default: `api.github.com`

CLI: `--apiHostname "api.github.my-private-company.com"`
