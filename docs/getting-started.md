# Getting started

- [Setup for new users](#new-user-create-user-config)
- [Configure new project](#new-project-create-project-config)

### New user: create user config

**Install**

```
npm install -g backport
```

Edit `~/.backport/config.json`:

```json
{
  "accessToken": "<your-github-accesstoken>",
  "username": "<your-github-username>"
}
```

**Create access token**

You can create a new access token [here](https://github.com/settings/tokens/new) (password required). The minimum permissions depends on whether the repository you want to access is private or public

- **Private repository**
  - repo:status
  - repo_deployment
  - public_repo
  - repo:invite
- **Public repository**

  - public_repo

  Read more about [Github Access Tokens](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line)

**Use `backport`**

Open your terminal and `cd` to the project your want to backport. Run:

```
backport
```

Note: It is recommend to add a `.backportrc.json` file to your project folder (see below for more info)

### New project: create project config

To avoid every user having to configure a project, a `.backportrc.json` file should be added to the root of the project with a similar structure:

```json
{
  "upstream": "elastic/kibana",
  "branches": [{ "name": "6.x", "checked": true }, "6.3", "6.2", "6.1", "6.0"],
  "labels": ["backport"]
}
```

Read more about project-specific configs [here](https://github.com/sqren/backport/blob/master/docs/configuration.md#project-specific-configuration)
