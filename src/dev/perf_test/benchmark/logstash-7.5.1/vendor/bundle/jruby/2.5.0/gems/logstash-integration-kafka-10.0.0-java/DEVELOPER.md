# logsstash-integration-kafka

Apache Kafka integration for Logstash, including Input and Output plugins.

# Dependencies

* Apache Kafka version 0.8.1.1
* jruby-kafka library

# Plugins


## logstash-input-kafka

Apache Kafka input for Logstash. This input will consume messages from a Kafka topic using the high level consumer API exposed by Kafka. 

For more information about Kafka, refer to this [documentation](http://kafka.apache.org/documentation.html) 

Information about high level consumer API can be found [here](http://kafka.apache.org/documentation.html#highlevelconsumerapi)

### Logstash Configuration

See http://kafka.apache.org/documentation.html#consumerconfigs for details about the Kafka consumer options.

    input {
        kafka {
            topic_id => ... # string (optional), default: nil, The topic to consume messages from. Can be a java regular expression for whitelist of topics.
            white_list => ... # string (optional), default: nil, Blacklist of topics to exclude from consumption.
            black_list => ... # string (optional), default: nil, Whitelist of topics to include for consumption.
            zk_connect => ... # string (optional), default: "localhost:2181", Specifies the ZooKeeper connection string in the form hostname:port
            group_id => ... # string (optional), default: "logstash", A string that uniquely identifies the group of consumer processes
            reset_beginning => ... # boolean (optional), default: false, Specify whether to jump to beginning of the queue when there is no initial offset in ZK
            auto_offset_reset => ... # string (optional), one of [ "largest", "smallest"] default => 'largest', Where consumer should start if group does not already have an established offset or offset is invalid
            consumer_threads => ... # number (optional), default: 1, Number of threads to read from the partitions
            queue_size => ... # number (optional), default: 20, Internal Logstash queue size used to hold events in memory 
            rebalance_max_retries => ... # number (optional), default: 4
            rebalance_backoff_ms => ... # number (optional), default:  2000
            consumer_timeout_ms => ... # number (optional), default: -1
            consumer_restart_on_error => ... # boolean (optional), default: true
            consumer_restart_sleep_ms => ... # number (optional), default: 0
            decorate_events => ... # boolean (optional), default: false, Option to add Kafka metadata like topic, message size to the event
            consumer_id => ... # string (optional), default: nil
            fetch_message_max_bytes => ... # number (optional), default: 1048576
        }
    }

The default codec is json

## logstash-output-kafka

Apache Kafka output for Logstash. This output will produce messages to a Kafka topic using the producer API exposed by Kafka. 

For more information about Kafka, refer to this [documentation](http://kafka.apache.org/documentation.html) 

Information about producer API can be found [here](http://kafka.apache.org/documentation.html#apidesign)

### Logstash Configuration

See http://kafka.apache.org/documentation.html#producerconfigs for details about the Kafka producer options.

    output {
        kafka {
            topic_id => ... # string (required), The topic to produce the messages to
            broker_list => ... # string (optional), default: "localhost:9092", This is for bootstrapping and the producer will only use it for getting metadata
            compression_codec => ... # string (optional), one of ["none", "gzip", "snappy"], default: "none"
            compressed_topics => ... # string (optional), default: "", This parameter allows you to set whether compression should be turned on for particular
            request_required_acks => ... # number (optional), one of [-1, 0, 1], default: 0, This value controls when a produce request is considered completed
            serializer_class => ... # string, (optional) default: "kafka.serializer.StringEncoder", The serializer class for messages. The default encoder takes a byte[] and returns the same byte[]
            partitioner_class => ... # string (optional) default: "kafka.producer.DefaultPartitioner"
            request_timeout_ms => ... # number (optional) default: 10000
            producer_type => ... # string (optional), one of ["sync", "async"] default => 'sync'
            key_serializer_class => ... # string (optional) default: kafka.serializer.StringEncoder
            message_send_max_retries => ... # number (optional) default: 3
            retry_backoff_ms => ... # number (optional) default: 100
            topic_metadata_refresh_interval_ms => ... # number (optional) default: 600 * 1000
            queue_buffering_max_ms => ... # number (optional) default: 5000
            queue_buffering_max_messages => ... # number (optional) default: 10000
            queue_enqueue_timeout_ms => ... # number (optional) default: -1
            batch_num_messages => ... # number (optional) default: 200
            send_buffer_bytes => ... # number (optional) default: 100 * 1024
            client_id => ... # string (optional) default: ""
            partition_key_format => ... # string (optional) default: nil, Provides a way to specify a partition key as a string
        }
    }

The default codec is json for outputs.  If you select a codec of plain, logstash will encode your messages with not only the message
but also with a timestamp and hostname.  If you do not want anything but your message passing through, you should make
the output configuration something like:

    output {
        kafka {
            codec => plain {
                format => "%{message}"
            }
            topic_id => "my_topic_id"
        }
    }
