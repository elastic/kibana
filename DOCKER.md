# Containerized development environment for Kibana

Kibana development moves quickly and has specific NodeJS requirements, which can
change depending on the current branch or commit. This makes developing a plugin
challenging for local development.

We created a containerized environment to encapsulate the necessary dependencies
and reduce issues, especially when switching between Kibana versions.

## Assumptions

By default, this setup assumes that you are running Elasticsearch via the
`apm-integration-testing` repo. However, you can override this as described
below.

## Usage

You will first need to build the Docker image for the Kibana environment:

```
make build
```

This will create a Docker image with the tag `kibana-dev:8.1.x`.

If you wish to change the image version, you can run this instead:

```
make build KIBANA_VERSION=8.2
```

Next, you can start the container using this (assumes Docker image is
`kibana-dev:8.1.x` and Elasticsearch is running on the `apm-integration-testing`
Docker network):

```
make run
```

If your Elasticsearch instance is not running via Docker, you can run this:

```
make run-networkless
```

## Configuration

* `KIBANA_VERSION`

This is the version of the Docker image. This can be used to build separate
images for different Kibana versions.

* `NETWORK`

This is the Docker network to use so that Kibana can connect to a local running
instance of Elasticsearch.

* `PORT`

This is the exposed port for the Kibana instance. This is useful if you have
conflicts with another running instance.
