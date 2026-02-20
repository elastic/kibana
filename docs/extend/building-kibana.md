---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/building-kibana.html
---

# Building a Kibana distributable [building-kibana]

To build a {{kib}} production distributable, use the following command:

```bash
yarn build --skip-os-packages
```

You can get all build options using the following command:

```bash
yarn build --help
```


## Building OS packages [_building_os_packages]

Packages are built using fpm, dpkg, and rpm, and Docker.  Package building has only been tested on Linux and is not supported on any other platform. Docker installation instructions can be found at [Install Docker Engine](https://docs.docker.com/engine/install/).

```bash
apt-get install ruby ruby-dev rpm dpkg build-essential
gem install fpm -v 1.5.0
yarn build --skip-archives
```

To specify a package to build you can add `rpm` or `deb` as an argument.

```bash
yarn build --rpm
```

Distributable packages can be found in `target/` after the build completes.

