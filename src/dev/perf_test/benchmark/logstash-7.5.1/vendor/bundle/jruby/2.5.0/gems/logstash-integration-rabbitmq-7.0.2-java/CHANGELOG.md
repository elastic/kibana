## 7.0.2
  - Fixes issue in Output where failure to register connection reovery hooks prevented the output from starting

## 7.0.1
  - Improves Input Plugin documentation to better align with upstream guidance [#4](https://github.com/logstash-plugins/logstash-integration-rabbitmq/pull/4)

## 7.0.0
  - Initial release of the RabbitMQ Integration Plugin, which combines
    previously-separate RabbitMQ plugins and shared dependencies into a single
    codebase; independent changelogs for previous versions can be found:
     - [RabbitMQ Input Plugin @6.0.3](https://github.com/logstash-plugins/logstash-input-rabbitmq/blob/v6.0.3/CHANGELOG.md)
     - [RabbitMQ Output Plugin @5.1.1](https://github.com/logstash-plugins/logstash-output-rabbitmq/blob/v5.1.1/CHANGELOG.md)
  - Absorbed connection mixin dependency; independent changelog history for
    the mixin can be found here: [RabbitMQ Connection Mixin @5.1.0](https://github.com/logstash-plugins/logstash-mixin-rabbitmq_connection/blob/v5.1.0/CHANGELOG.md)
  - In the Output plugin, when a connection is flagged as blocked, back-pressure is now propagated to the pipeline until the connection is either unblocked or recovered, preventing runaway writes to blocked connections ([#1](https://github.com/logstash-plugins/logstash-integration-rabbitmq/pull/1))
