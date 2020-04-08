# Netflow Module README

## Configuration

There is only one variable associated with netflow, which is the port on which to listen for traffic.

The default port is `2055`.

For Elasticsearch-specific configuration—which is common to all modules—see the official Logstash documentation.

### Launching from the command-line

```
$LS_HOME/bin/logstash --modules netflow -M netflow.var.input.udp.port=XXXX
```

### Adding to `logstash.yml`

Ensure these lines are properly added to your `logstash.yml`:

```
modules:
  - name: netflow
    var.input.udp.port: XXXX
```

With this properly configured, when Logstash is started, it will run the module.