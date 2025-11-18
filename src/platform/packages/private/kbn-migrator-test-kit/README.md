# @kbn/migrator-test-kit

Utility library that allows testing the Saved Objects migration logic without having to start a full Kibana instance.

This prevents noise from the Kibana plugins and other services which also interact with the Saved Object indices, often introducing unwanted indices and documents, and eventually causing race conditions.
