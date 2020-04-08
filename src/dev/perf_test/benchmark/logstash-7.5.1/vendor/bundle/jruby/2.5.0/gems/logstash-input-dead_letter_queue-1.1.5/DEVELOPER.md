logstash-input-dead_letter_queue
====================

Logstash Dead Letter Queue Input Plugin, This plugin enables reading from Logstash's dead-letter-queue.

Logstash Configuration
====================

    input {
        dead_letter_queue {
            path => ... # string (required) Path to dead letter queue directory containing segment files
        }
    }

This plugin uses its own decoding logic and ignores the `codec` options.

Dependencies
====================

* Logstash >= 5.4
