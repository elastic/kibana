---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/running-kibana-advanced.html
---

# Running Kibana [running-kibana-advanced]

Change to your local {{kib}} directory. Start the development server.

```bash
yarn start
```

Now you can point your web browser to [http://localhost:5601](http://localhost:5601) and start using {{kib}}! When running `yarn start`, {{kib}} will also log that it is listening on port 5603 due to the base path proxy, but you should still access {{kib}} on port 5601.

By default, you can log in with username `elastic` and password `changeme`. See the `--help` options on `yarn es <command>` if you’d like to configure a different password.


## Unsupported URL Type [_unsupported_url_type]

If you’re installing dependencies and seeing an error that looks something like

```
Unsupported URL Type: link:packages/kbn-eslint-config
```
you’re likely running `npm`. To install dependencies in {{kib}} you need to run `yarn kbn bootstrap`.

% This section doesn't exist here or in the AsciiDoc docs
% For more info, see [Setting Up Your Development Environment](#setting-up-your-development-environment) above.


## Customizing `config/kibana.dev.yml` [customize-kibana-yml]

The `config/kibana.yml` file stores user configuration directives. Since this file is checked into source control, however, developer preferences can’t be saved without the risk of accidentally committing the modified version. To make customizing configuration easier during development, the {{kib}} CLI will look for a `config/kibana.dev.yml` file if run with the `--dev` flag. This file behaves just like the non-dev version and accepts any of the [standard settings](/reference/configuration-reference/general-settings.md).


## Using an Alternate YML File [_using_an_alternate_yml_file]

To run Kibana with an alternate yml file, use the `--config` option to specify the path to the desired yml file. For example: `yarn start --config=config/my_config.yml`


## Potential Optimization Pitfalls [_potential_optimization_pitfalls]

* Webpack is trying to include a file in the bundle that was deleted and is now complaining about it being missing
* A module id that used to resolve to a single file now resolves to a directory, but webpack isn’t adapting
* (if you discover other scenarios, please send a PR!)


## Setting Up SSL [_setting_up_ssl]

{{kib}} includes self-signed certificates that can be used for development purposes in the browser and for communicating with {{es}}: `yarn start --ssl` & `yarn es snapshot --ssl`.

