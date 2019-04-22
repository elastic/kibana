# Configuration

- [User configuration](#userglobal-configuration)
- [Project configuration](#project-specific-configuration)

### User/global configuration

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

Please select the necessary access scopes:

- **Private repository**
  - repo:status
  - repo_deployment
  - public_repo
  - repo:invite
- **Public repository**
  - public_repo

##### `username` (string) **required**

Your Github username

### Project-specific configuration

`.backportrc.json` can be added to every project where you use `backport`. This is useful for sharing configuration options with other project contributors.

Example:

```json
{
  "upstream": "elastic/kibana",
  "branches": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"],
  "all": false,
  "multipleCommits": false,
  "multipleBranches": true,
  "labels": ["backport"]
}
```

##### `upstream` (string) **required**

Github organization/user and repository name separated with forward slash.

##### `branches` (string[] | object[])

List of branches that will be available to backport to. The list can contain string and objects. If a string is given, it must be the name of a branch, if an object is given it must use the format `{"name": "<string>", "checked": <boolean>}` where `name` is the branch name and `"checked"` indicates whether the branch should be auto-selected. It is useful to auto-select branches you often backport to.

##### `all` (boolean)

`true`: list all commits

`false`: list commits by you only

Default: `false`

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
