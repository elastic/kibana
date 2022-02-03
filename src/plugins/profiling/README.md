# profiling

A Kibana plugin

---

## Getting started

### Prerequisites

1. nvm: See [installation instructions](https://github.com/nvm-sh/nvm#install--update-script)
1. Elasticsearch: See [Local development environment setup](https://docs.google.com/document/d/1gzK8yC_MptfMJkx6QAud6GSv8br0WcYW4vuX0VeuNrI/edit) to start an Elasticsearch cluster

### Configure local Kibana environment

The easiest way to configure your local Kibana environment is to create a
`config/kibana.dev.yml` in the repo's root directory.

Example configuration:

```yaml
# https://www.elastic.co/guide/en/kibana/8.0/settings.html

# If you run the Kibana dev environment within a container or wish to access the
# UI beyond your local machine, you will need this setting

server.host: "0.0.0.0"

# If there is a mismatch between your local Kibana env and the running Elasticsearch
# cluster, then this setting will change the error message to a warning

elasticsearch.ignoreVersionMismatch: true

# Required to connect to your Elasticsearch cluster
# (settings below assume you are using elastic/apm-integration-testing)
# Adjust as necessary

elasticsearch.hosts: "http://localhost:9200"
elasticsearch.username: "kibana_system_user"
elasticsearch.password: "changeme"

# Optional settings to remove warnings and errors from browser console

newsfeed.enabled: false
telemetry.enabled: false

xpack.reporting.kibanaServer.hostname: localhost
xpack.reporting.roles.enabled: false
```

### Running local Kibana

You should expect some of these commands to take several minutes to finish.

1. `nvm use` to install the necessary version of node.js
1. `yarn kbn bootstrap` to install dependencies and prepare the development environment
1. `yarn start` to start the hot-reloading development server
1. Open `http://localhost:5601` in your favorite browser to view the Kibana UI
1. Enter credentials as needed for your Elasticsearch cluster
1. Open left sidebar and click on "Prodfiler" at the bottom

## Set up environment to use fixtures instead of Elasticsearch

By default, we assume you will use an Elasticsearch server to serve data to the Kibana UI plugin.

However, if you wish to host an offline demo, you do not have an active Elasticsearch server, or
would like to see the expected behavior, you can switch over to using fixtures to serve data.

1. Go to `server/fixtures` and uncompress the `*.zst` files
2. Open `public/services.ts` and change `getRemoteRoutePaths` to `getLocalRoutePaths`
3. Refresh Kibana UI

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
