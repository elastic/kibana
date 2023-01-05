# @kbn/health-gateway-server

This package runs a small server called the Health Gateway, which exists to 
check the health of multiple Kibana instances and return an aggregated result.

This is used by the Elastic Cloud infrastructure to run two different Kibana processes 
with different `node.roles`: one process for handling UI requests, and one for background
tasks.

## Configuration

Similar to Kibana, the gateway has a yml configuration file that it reads from. By default
this lives alongside the `kibana.yml` at `<REPO_ROOT>/config/gateway.yml`. Like Kibana,
you can provide a `-c` or `--config` CLI argument to override the location of the config
file.

For example:
```bash
$ yarn start --config /path/to/some/other/config.yml
```
Here is a sample configuration file recommended for use in development:

```yaml
# config/gateway.yml
server:
  port: 3000
  host: 'localhost'
  ssl:
    enabled: true
    # Using Kibana test certs
    key: /path/to/packages/kbn-dev-utils/certs/kibana.key
    certificate: /path/to/packages/kbn-dev-utils/certs/kibana.crt
    certificateAuthorities: /path/to/packages/kbn-dev-utils/certs/ca.crt
 
kibana:
  hosts:
    - 'https://localhost:5605'
    - 'https://localhost:5606'
  ssl:
    # Using Kibana test certs
    certificate: /path/to/packages/kbn-dev-utils/certs/kibana.crt
    certificateAuthorities: /path/to/packages/kbn-dev-utils/certs/ca.crt
    verificationMode: certificate

logging:
  root:
    appenders: ['console']
    level: 'all'
```

Note that the gateway supports the same logging configuration as Kibana, including
all of the same appenders.

## Development & Testing

To run this locally, first you need to create a `config/gateway.yml` file. There's a
`docker-compose.yml` intended for development, which will run Elasticsearch and
two different Kibana instances for testing. Before using it, you'll want to create
a `.env` file:

```bash
# From the /packages/kbn-health-gateway-server/scripts directory
$ cp .env.example .env
# (modify the .env settings if desired)
$ docker-compose up
```

This will automatically run Kibana on the ports from the sample `gateway.yml`
above (5605-5606).

Once you have your `gateway.yml` and have started docker-compose, you can run the
server from the `/packages/kbn-health-gateway-server` directory with `yarn start`. Then you should
be able to make requests to the `/` endpoint:

```bash
$ curl "https://localhost:3000/"
```
