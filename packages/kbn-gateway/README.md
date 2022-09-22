# @kbn/gateway

This package runs a small proxy server called the Health Gateway, which exists to query
the status APIs of multiple Kibana instances and return an aggregated result.

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
 
kibana:
  hosts:
    - 'http://localhost:5605'
    - 'http://localhost:5606'

logging:
  root:
    appenders: ['console']
    level: 'all'
```

Note that the gateway supports the same logging configuration as Kibana, including
all of the same appenders.

## Development & Testing

To run this locally, first you need to create a `config/gateway.yml` file. There's a
script included for development that uses `docker-compose` to run Elasticsearch and
two different Kibana instances for testing:

```bash
# From the /packages/kbn-gateway directory
$ ./scripts/dev.sh 8.4.0
```

The script will automatically run Kibana on the ports from the sample `gateway.yml`
above (5605-5606). Note that you need to pass a stack version to the script so it
knows which docker images to pull.

Once you have your `gateway.yml` and have started the dev script, you can run the
server from the `/packages/kbn-gateway` directory with `yarn start`. Then you should
be able to make requests to the `/api/status` endpoint:

```bash
$ curl "http://localhost:3000/api/status"
```
