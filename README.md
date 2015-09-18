Sense
=====

A JSON aware developer's interface to ElasticSearch. Comes with handy machinery such as syntax highlighting, autocomplete,
formatting and code folding.

Installation
======

TBD


Setting up a development environment
======

1. setup kibana
--------

- Install nvm:  brew install nvm  (or any other way)
- If installing with brew on OS X, add `source $(brew --prefix nvm)/nvm.sh` to your login profile so that you can use `nvm` on the command line
- Clone kibana:

```
git clone https://github.com/elastic/kibana.git  kibana
cd kibana
git checkout 327f5898a79564123651f71fe71fb1a17477f977
```

- Finish installation according to https://github.com/elastic/kibana/blob/327f5898a79564123651f71fe71fb1a17477f977/CONTRIBUTING.md#development-environment-setup
  - Skip running elasticsearch
  - Do not run `./bin/kibana --dev` just yet.

2. Add development config
-------

create a file named `config/kibana.dev.yml`, with the following content:

```
kibana.enabled: false
elasticsearch.enabled: false
optimize:
  sourceMaps: '#cheap-module-source-map'
  unsafeCache: true
  lazyPrebuild: false
```

3. check out sense
---

```
cd installedPlugins
git clone git@github.com:elastic/sense.git
```

4. run!
---
from the kibana root:

```
./bin/kibana --dev
```

verify by visiting: http://localhost:5601/app/sense/