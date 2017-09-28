# backport

### Install
```
npm install -g backport
```

### Usage
```
> backport
```

### Configuration
You must add your username and create a new [Github access token](https://github.com/settings/tokens/new) in `/<homedir>/.backport/config.json`

### Troubleshooting

`backport` never touches your local repositories or files. Instead a separate clone of your repositories are created in `/<homedir>/.backport/repositories/`. This is also where you'll need to solve merge conflicts.
If you are experiencing issues, you can try deleting the repository, or the entire `.backport` folder - it will be recreated next time you run `backport`.
