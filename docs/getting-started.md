# Getting started

* [Setup for new users](#new-user-create-user-config)
* [Configure new project](#new-project-create-project-config)

### New user: create user config

**Install**

```
npm install -g backport
```

Edit `~/`.backport/config.json`:

```json
{
  "accessToken": "<your-github-accesstoken>",
  "username": "<your-github-username>"
}
```

**Create access token**

You can create a new access token [here](https://github.com/settings/tokens/new). The minimum permissions depends on the type of repository:

* Private repository
  * repo:status
  * repo_deployment
  * public_repo
  * repo:invite
* Public repository
  * public_repo

**Use `backport`**

Open your terminal and `cd` to the project your want to backport in. Run:

```
backport
```

Note: The project folder must contain a `.backportrc.json` file (see "[New project: create project config](#new-project-create-project-config)" for more info)

### New project: create project config

To avoid every user having to configure a project, a project config file should be added to the root of the project.
Create a file `.backportrc.json` in the root of the project with a similar structur:

```json
{
  "upstream": "elastic/kibana",
  "branches": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"],
  "labels": ["backport"]
}
```

Read more about project-specific configs [here](https://github.com/sqren/backport/blob/master/docs/configuration.md#project-specific-configuration)
