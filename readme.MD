# backport

[![Greenkeeper badge](https://badges.greenkeeper.io/sqren/backport-cli.svg)](https://greenkeeper.io/)

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

  // Repositories and the versions that will be available in backport cli
  "repositories": [
    {
      "name": "elastic/x-pack-kibana",
      "versions": ["6.x", "6.0", "5.6", "5.5", "5.4"]
    },
    {
      "name": "elastic/kibana",
      "versions": ["6.x", "6.0", "5.6", "5.5", "5.4"]
    }
  ]
}

```
</details>

### Troubleshooting

`backport` never touches your local repositories or files. Instead a separate clone of your repositories are created in `/<homedir>/.backport/repositories/`. This is also where you'll need to solve merge conflicts.
If you are experiencing issues, you can try deleting the repository, or the entire `.backport` folder - it will be recreated next time you run `backport`.
