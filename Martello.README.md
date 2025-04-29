# Git clone

The git repo for kibana is HUGE. A full clone is over 16GB. To make it a bit trimmer, you can do a "blobless" clone:

`git clone --filter=blob:none git@github.com:martellotech/kibana.git`

The URL may vary depending on how you authorize with github (this is SSH key auth, for example). This method produces a checkout less than 3GB.
Then, when you checkout based on a branch or tag, it will download what it needs on demand.

The martellotech fork will be kept up to date with the elastic remote. So, all tags will be available.

`git checkout -b pluginDemo v7.17.27`


# Setup

`nvm use`

`yarn kbn bootstrapp --force-install`


# Build plugin
Source: https://www.elastic.co/guide/en/kibana/current/plugin-tooling.html

`node scripts/generate_plugin`


# Docker container
docker build -f Dockerfile.martello -t kibana-martello .