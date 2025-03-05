---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-getting-started.html
---

# Getting started [development-getting-started]

Get started building your own plugins, or contributing directly to the {{kib}} repo.


## Developing on Windows [developing-on-windows]

We do not support Windows native development anymore and in order to develop Kibana on Windows please [setup a WSL environment](https://docs.microsoft.com/en-us/windows/wsl/setup/environment) which will give you a much better experience. In addition to that you will also benefit from [run GUI apps on WSL](https://docs.microsoft.com/en-us/windows/wsl/tutorials/gui-apps) like Chrome for test and debug purposes. Once completed, follow the rest of this guide inside the WSL.


## Get the code [get-kibana-code]

[Fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo), then [clone](https://help.github.com/en/github/getting-started-with-github/fork-a-repo#step-2-create-a-local-clone-of-your-fork) the [{{kib}} repo](https://github.com/elastic/kibana/) and change directory into it:

```bash
git clone https://github.com/[YOUR_USERNAME]/kibana.git kibana
cd kibana
```


## Install dependencies [_install_dependencies]

Install the version of Node.js listed in the `.node-version` file. This can be automated with tools such as [nvm](https://github.com/nvm-sh/nvm) or [avn](https://github.com/wbyoung/avn). As we also include a `.nvmrc` file you can switch to the correct version when using nvm by running:

```bash
nvm use
```

Install the latest version of [yarn v1](https://classic.yarnpkg.com/en/docs/install).

Bootstrap {{kib}} and install all the dependencies:

```bash
yarn kbn bootstrap
```

In case you don’t have an internet connection, the `yarn kbn bootstrap` command will fail. As it is likely you have the required node_modules in the offline mirror, you can try to run the step in offline mode by using:

```bash
yarn kbn bootstrap --offline
```

In any other circumstance where you want to force the node_modules install step you can use:

```bash
yarn kbn bootstrap --force-install
```

You can also run `yarn kbn` to see the other available commands.

When switching branches which use different versions of npm packages you may need to run:

```bash
yarn kbn clean
```

::::{note}
Running this command is only necessary in rare circumstance where you need to recover a consistent state when problems arise. If you need to run this command often, complete this form to provide feedback: [https://ela.st/yarn-kbn-clean](https://ela.st/yarn-kbn-clean)
::::


If you have failures during `yarn kbn bootstrap` you may have some corrupted packages in your yarn cache which you can clean with:

```bash
yarn cache clean
```


## Configure environmental settings [_configure_environmental_settings]


### Increase node.js heap size [increase-nodejs-heap-size]

{{kib}} is a big project and for some commands it can happen that the process hits the default heap limit and crashes with an out-of-memory error. If you run into this problem, you can increase maximum heap size by setting the `--max_old_space_size` option on the command line. To set the limit for all commands, simply add the following line to your shell config: `export NODE_OPTIONS="--max_old_space_size=2048"`.


## Run {{es}} [_run_es]

Run the latest {{es}} snapshot. Specify an optional license with the `--license` flag.

```bash
yarn es snapshot --license trial
```

`trial` will give you access to all capabilities.

Read about more options for [Running {{es}} during development](/extend/running-elasticsearch.md), like connecting to a remote host, running from source, preserving data inbetween runs, running remote cluster, etc.


## Run {{kib}} [_run_kib]

In another terminal window, start up {{kib}}. Include [developer examples](https://github.com/elastic/kibana/tree/master/examples) by adding an optional `--run-examples` flag.

```bash
yarn start --run-examples
```

View all available options by running `yarn start --help`

Read about more advanced options for [Running {{kib}}](/extend/running-kibana-advanced.md).


## Install pre-commit hook (optional) [_install_pre_commit_hook_optional]

In case you want to run a couple of checks like linting or check the file casing of the files to commit, we provide a way to install a pre-commit hook. To configure it you just need to run the following:

```bash
node scripts/register_git_hook
```

After the script completes the pre-commit hook will be created within the file `.git/hooks/pre-commit`. If you choose to not install it, don’t worry, we still run a quick ci check to provide feedback earliest as we can about the same checks.


## Code away! [_code_away]

You are now ready to start developing. Changes to your files should be picked up automatically. Server side changes will cause the {{kib}} server to reboot.


## More information [_more_information]

* [Running {{kib}}](/extend/running-kibana-advanced.md)
* [Installing sample data](/extend/sample-data.md)
* [Debugging {{kib}}](/extend/kibana-debugging.md)
* [Building a {{kib}} distributable](/extend/building-kibana.md)
* [Plugin Resources](/extend/development-plugin-resources.md)







