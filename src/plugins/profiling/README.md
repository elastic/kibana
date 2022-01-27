# profiling

A Kibana plugin

---

## Set up environment to use fixtures instead of Elasticsearch

By default, we assume you will use an Elasticsearch server to serve data to the Kibana UI plugin.

However, if you wish to host an offline demo, you do not have an active Elasticsearch server, or
would like to see the expected behavior, you can switch over to using fixtures to serve data.

1. Go to `server/fixtures` and uncompress the `*.zst` files
2. Open `public/services.ts` and change `getRemoteRoutePaths` to `getLocalRoutePaths`
3. Refresh Kibana UI

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
