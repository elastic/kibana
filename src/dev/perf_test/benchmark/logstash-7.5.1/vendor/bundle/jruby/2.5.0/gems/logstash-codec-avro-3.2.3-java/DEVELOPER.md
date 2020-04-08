Logstash Avro Codec
===================

How to Install
--------------

```
bin/plugin install logstash-avro-codec
```

How to Use
----------
You can use this codec to decode avro messages
in a Kafka topic input.

Here is an example schema for tweets.

### tweet.avsc
```
{
  "type" : "record",
  "name" : "twitter_schema",
  "namespace" : "com.miguno.avro",
  "fields" : [ {
    "name" : "username",
    "type" : "string",
    "doc" : "Name of the user account on Twitter.com"
  }, {
    "name" : "tweet",
    "type" : "string",
    "doc" : "The content of the user's Twitter message"
  }, {
    "name" : "timestamp",
    "type" : "long",
    "doc" : "Unix epoch time in seconds"
  } ],
  "doc:" : "A basic schema for storing Twitter messages"
}
```

Along with the logstash config for reading in messages of this 
type using the avro codec with the logstash-input-kafka plugin.

### logstash.conf

```
input {
  kafka {
    topic_id => 'test_topic'
      codec => avro {
        schema_uri => 'tweet.avsc'
      }
  }
}

output {
  stdout {
    codec => rubydebug
  }
}
```

### Running the setup
```
bin/logstash -f logstash.conf
```
