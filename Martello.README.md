# Git clone

The git repo for kibana is HUGE. A full clone is over 16GB. To make it a bit trimmer, you can do a "blobless" clone:

`git clone --filter=blob:none git@github.com:martellotech/kibana.git`

The URL may vary depending on how you authorize with github (this is SSH key auth, for example). This method produces a checkout less than 3GB.
Then, when you checkout based on a branch or tag, it will download what it needs on demand.

Note if you run into an error due to the filepaths being too long in windows run the following command:
`git config --system core.longpaths true`

The martellotech fork will be kept up to date with the elastic remote. So, all tags will be available.

`git checkout -b pluginDemo v7.17.27`


# Setup
Source: https://www.elastic.co/docs/extend/kibana/development-getting-started

If running on windows Elasticsearch recomends you use wsl. 

`nvm use`

`yarn kbn bootstrap --force-install`


# Build new plugin
Source: https://www.elastic.co/guide/en/kibana/current/plugin-tooling.html

`node scripts/generate_plugin`

You will most likely want to select the following options:
- Will this plugin be part of the Kibana repository?: No
- What type of internal plugin would you like to create: Kibana OSS

Delete the .git folder and the gitignore file in the newly created plugin so that it can be added to this repo

# Build Existing Plugin
run 'yarn build' in your plugin folder

# Docker container
`docker build -f Dockerfile.martello -t kibana-martello .`

to run, replace the kibana container image line [path to repo]\vdx\dev-tools\docker-compose.yml with
`image: kibana-martello`