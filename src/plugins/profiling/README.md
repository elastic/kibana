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
1. Enter username `admin` and password `changeme` at login prompt
1. Open left sidebar and click on "Prodfiler" at the bottom

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

### Update dev branch with changes from upstream

As of this writing, we use the branch `8.2+profiler` for the development of Kibana profiling plugin under `src/plugins/profiling/`.

Make sure the remote `upstream` exists. If it doesn't, create it with `git remote add upstream https://github.com/elastic/kibana`.

To update to the latest `8.2` from upstream:
- get latest changes from all remotes with `git fetch --all --prune`
- execute `git checkout 8.2+profiler` and `git pull` to make sure you have the latest changes from `optimyze/kibana`
- get the latest changes from upstream with `git fetch upstream`
- update with `git rebase upstream/8.2` and push with `git push --force-with-lease`

### Upgrade dev branch to next Kibana version

From time to time we want to upgrade the Kibana version for development to the latest release version.

Make sure the remote `upstream` exists. If it doesn't, create it with `git remote add upstream https://github.com/elastic/kibana`.

Example on how upgrade from 8.2 to 8.3:
- get latest changes from all remotes with `git fetch --all --prune`
- create and checkout the new development branch with `git checkout -b 8.3+profiler upstream/8.3`
- cherry-pick all our changes from `8.2+profiler` with e.g. `git cherry-pick 10fdea5a7156ca0d576142e78ab0d17dc7420b1d^..8.2+profiler`, where that commit hash refers to our first commit (created by Stephanie at 07 Dec "add initial profiling search").
- fix the merge conflicts that are likely popping up. Normally, these are in `package.json` and `yarn.lock`.
- when done, push the new branch to our development repository with `git push --set-upstream origin 8.3+profiler`

### Build and push the ES cloud docker image

In order to deploy a custom ES build in our MVP or testing cluster, we have to build the ES cloud docker image locally and push it to the Elastic docker registry.
You'll need a login to the Elastic container library. [Follow this doc to get access to the registry](https://github.com/elastic/infra/blob/master/docs/container-registry/accessing-the-docker-registry.md).

From within the local `elasticsearch` repository:
- checkout the branch you want to deploy with e.g. `git checkout prodfiler`
- build ES with `./gradlew -p distribution/docker build`
- docker tag with `docker tag docker.elastic.co/elasticsearch-ci/elasticsearch-cloud:8.3.0-SNAPSHOT docker.elastic.co/observability-ci/elasticsearch-profiling:8.3.0-$(git rev-parse --short HEAD)` (the previous build step shows the version, if in doubt look at the first entry of `docker image ls`).
- push the docker image with `docker push docker.elastic.co/observability-ci/elasticsearch-profiling:8.3.0-$(git rev-parse --short HEAD)`
- for later deployment, take note of the output of `echo docker.elastic.co/observability-ci/elasticsearch-profiling:8.3.0-$(git rev-parse --short HEAD)`

### Build and push the Kibana cloud docker image

In order to deploy a custom Kibana build in our MVP or testing cluster, we have to build the Kibana cloud docker image locally and push it to the Elastic docker registry.
You'll need a login to the Elastic container library. [Follow this doc to get access to the registry](https://github.com/elastic/infra/blob/master/docs/container-registry/accessing-the-docker-registry.md).

From within the local `kibana` repository:
- checkout the branch you want to deploy with e.g. `git checkout 8.3+profiler`
- if you didn't do this before on your branch: `yarn kbn reset && yarn kbn bootstrap`
- build the docker image with `node scripts/build --docker-images --skip-docker-ubi --skip-docker-ubuntu`
- docker tag with `docker tag docker.elastic.co/kibana-ci/kibana-cloud:8.4.0-SNAPSHOT docker.elastic.co/observability-ci/kibana-profiling:8.4.0-$(git rev-parse --short HEAD)` (the previous build step shows the version, if in doubt look at the first entry of `docker image ls`)
- push the docker image with `docker push docker.elastic.co/observability-ci/kibana-profiling:8.4.0-$(git rev-parse --short HEAD)`
- for later deployment, take note of the output of `echo docker.elastic.co/observability-ci/kibana-profiling:8.4.0-$(git rev-parse --short HEAD)`
