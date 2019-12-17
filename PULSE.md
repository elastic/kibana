# Pulse POC

Pulse is the future of telemetry, and it aims to collect more granular data while
providing a more SaaS-like experience for all installs.

At the heart of this proof of concept are two components: the *service* and the *client*.

The *service* represents the remote REST API that would be deployed an elastic.co URL. In
this POC, the service exists as a plugin in Kibana so we can easily develop on it side by
side with the changes to Kibana itself. It's contained in
[`x-pack/plugins/pulse_poc`](./x-pack/plugins/pulse_poc) and is accessible at
`http://localhost:5601/api/pulse_poc`.

The *client* represents the core service within Kibana that manages interactions with the
remote service. It's contained in [`src/core/server/pulse`](./src/core/server/pulse).

The client periodically sends data, organized by *channel* to the service. The client
also periodically retrieves *instructions* from the service, which are also organized by
channel. In turn, the instructions are then used in relevant places in Kibana to extend
that functionality. Instructions are plain objects with an `owner` property, which
roughly indicates which plugin or core is responsible for handling this instruction, an
`id` property, which uniquely identifies a specific type of instruction, and a `value`
which contains content appropriate for that specific instruction.

When the service receives data, it ingests it into channel-specific indices named with
the format `pulse-poc-raw-<channelName>`.

When the service receives a request for instructions, it iterates over all of its channel
definitions and invokes all defined `check` functions, and the return values of that
become the instructions in the response.

## Running the POC

You must run Elasticsearch with security disabled, for example:

```sh
yarn es snapshot -E xpack.security.enabled=false
```

**You must wait for Elasticsearch to start up,** after which you must start Kibana on
localhost and port 5601 (the defaults) and not be using the basepath proxy:

```sh
yarn start --no-base-path
```

### Add the index patterns
You'll need to add the index patterns for each channel. To make this easy, use the dev tools in Kibana once it's started up.
The default channel uses 'pulse-poc-raw':
```kibana dev tools
# create the pulse-poc-raw index pattern

PUT pulse-poc-raw
{
  "settings": {
    "number_of_shards": 1
  },
  "mappings": {
    "properties": {
      "deployment_id": {"type": "keyword"}
    }
  }
}

# create a test document
POST /pulse-poc-raw/_doc
{
  "deployment_id": "123"
}

GET pulse-poc-raw/_mapping
# create the pulse-poc-raw-errors index pattern
```
The errors channel uses the pulse-poc-raw-errors index pattern:
Note: the mapping isn't fully defined yet :-)
```
# create the pulse-poc-raw-errors index pattern


PUT pulse-poc-raw-errors
{
  "settings": {
    "number_of_shards": 1
  },
  "mappings": {
    "properties": {
      "deployment_id": {"type": "keyword"},
      "error": { "type": "text"}
    }
  }
}

POST /pulse-poc-raw-errors/_doc
{
  "deployment_id": "123",
  "error": "Houston, we have a problem!"
}

GET pulse-poc-raw-errors
```


## Adding a channel

To add a channel to the service, create a directory for that channel in
[`x-pack/plugins/pulse_poc/server/channels`](./x-pack/plugins/pulse_poc/server/channels).
An empty directory is technically enough to allow receiving data for that channel, but in
practice you'll want to add at least one `check` function so the channel is providing
value back to the product in some way.

To add a channel to the client, create a TypeScript file for that channel in
[`src/core/server/pulse/collectors`](./src/core/server/pulse/collectors). In practice,
this file should export a record collector. See "Sending data" below.

## Adding instructions

To add an instruction, you must create a `check` function in the channel of your choice.
To do so, create a TypeScript file under the channel directory of your choice and prefix
its name with `check_`. This file must return an asynchronous function `check`.

Each `check` function either returns `undefined`, in which case that particular
instruction will not be included in the response, or it will return instruction object
that should be included in the response.

## Sending data

To send data from the client, you must use a channel *collector*. Collectors are defined
in [`src/core/server/pulse/collectors`](./src/core/server/pulse/collectors) and must each
export an asynchronous function `getRecords()`, which should return an array of one or
more telemetry records for that channel. Each record will ultimately be stored as an
individual document in that channel's index by the service.

## Using instructions

On the client, instructions are exposed as an observable, where each individual
instruction is a new value. Each channel has its own observable, which you retrieve via
`core.pulse.getChannel()`, like so:

```js
class MyPlugin {
  setup(core) {
    const instructions$ = core.pulse.getChannel('default').instructions$();

    instructions$.subscribe(instruction => {
      // instruction = { owner: 'my', id: 'foo_instruction', value: { foo: 'bar' } }
    });
  }
}
```

At that point, how the instruction is used is up to the individual integration.
