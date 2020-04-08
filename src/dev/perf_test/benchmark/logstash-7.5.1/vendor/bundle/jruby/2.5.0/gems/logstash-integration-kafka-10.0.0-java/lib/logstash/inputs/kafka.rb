require 'logstash/namespace'
require 'logstash/inputs/base'
require 'stud/interval'
require 'java'
require 'logstash-integration-kafka_jars.rb'

# This input will read events from a Kafka topic. It uses the 0.10 version of
# the consumer API provided by Kafka to read messages from the broker.
#
# Here's a compatibility matrix that shows the Kafka client versions that are compatible with each combination
# of Logstash and the Kafka input plugin: 
# 
# [options="header"]
# |==========================================================
# |Kafka Client Version |Logstash Version |Plugin Version |Why?
# |0.8       |2.0.0 - 2.x.x   |<3.0.0 |Legacy, 0.8 is still popular 
# |0.9       |2.0.0 - 2.3.x   | 3.x.x |Works with the old Ruby Event API (`event['product']['price'] = 10`)  
# |0.9       |2.4.x - 5.x.x   | 4.x.x |Works with the new getter/setter APIs (`event.set('[product][price]', 10)`)
# |0.10.0.x  |2.4.x - 5.x.x   | 5.x.x |Not compatible with the <= 0.9 broker
# |0.10.1.x  |2.4.x - 5.x.x   | 6.x.x |
# |==========================================================
# 
# NOTE: We recommended that you use matching Kafka client and broker versions. During upgrades, you should
# upgrade brokers before clients because brokers target backwards compatibility. For example, the 0.9 broker
# is compatible with both the 0.8 consumer and 0.9 consumer APIs, but not the other way around.
#
# This input supports connecting to Kafka over:
#
# * SSL (requires plugin version 3.0.0 or later)
# * Kerberos SASL (requires plugin version 5.1.0 or later) 
#
# By default security is disabled but can be turned on as needed.
#
# The Logstash Kafka consumer handles group management and uses the default offset management
# strategy using Kafka topics.
#
# Logstash instances by default form a single logical group to subscribe to Kafka topics
# Each Logstash Kafka consumer can run multiple threads to increase read throughput. Alternatively, 
# you could run multiple Logstash instances with the same `group_id` to spread the load across
# physical machines. Messages in a topic will be distributed to all Logstash instances with
# the same `group_id`.
#
# Ideally you should have as many threads as the number of partitions for a perfect balance --
# more threads than partitions means that some threads will be idle
#
# For more information see http://kafka.apache.org/documentation.html#theconsumer
#
# Kafka consumer configuration: http://kafka.apache.org/documentation.html#consumerconfigs
#
class LogStash::Inputs::Kafka < LogStash::Inputs::Base
  config_name 'kafka'

  default :codec, 'plain'

  # The frequency in milliseconds that the consumer offsets are committed to Kafka.
  config :auto_commit_interval_ms, :validate => :string, :default => "5000"
  # What to do when there is no initial offset in Kafka or if an offset is out of range:
  #
  # * earliest: automatically reset the offset to the earliest offset
  # * latest: automatically reset the offset to the latest offset
  # * none: throw exception to the consumer if no previous offset is found for the consumer's group
  # * anything else: throw exception to the consumer.
  config :auto_offset_reset, :validate => :string
  # A list of URLs of Kafka instances to use for establishing the initial connection to the cluster.
  # This list should be in the form of `host1:port1,host2:port2` These urls are just used
  # for the initial connection to discover the full cluster membership (which may change dynamically)
  # so this list need not contain the full set of servers (you may want more than one, though, in
  # case a server is down).
  config :bootstrap_servers, :validate => :string, :default => "localhost:9092"
  # Automatically check the CRC32 of the records consumed. This ensures no on-the-wire or on-disk
  # corruption to the messages occurred. This check adds some overhead, so it may be
  # disabled in cases seeking extreme performance.
  config :check_crcs, :validate => :string
  # The id string to pass to the server when making requests. The purpose of this
  # is to be able to track the source of requests beyond just ip/port by allowing
  # a logical application name to be included.
  config :client_id, :validate => :string, :default => "logstash"
  # Close idle connections after the number of milliseconds specified by this config.
  config :connections_max_idle_ms, :validate => :string
  # Ideally you should have as many threads as the number of partitions for a perfect
  # balance — more threads than partitions means that some threads will be idle
  config :consumer_threads, :validate => :number, :default => 1
  # If true, periodically commit to Kafka the offsets of messages already returned by the consumer. 
  # This committed offset will be used when the process fails as the position from
  # which the consumption will begin.
  config :enable_auto_commit, :validate => :string, :default => "true"
  # Whether records from internal topics (such as offsets) should be exposed to the consumer.
  # If set to true the only way to receive records from an internal topic is subscribing to it.
  config :exclude_internal_topics, :validate => :string
  # The maximum amount of data the server should return for a fetch request. This is not an 
  # absolute maximum, if the first message in the first non-empty partition of the fetch is larger 
  # than this value, the message will still be returned to ensure that the consumer can make progress.
  config :fetch_max_bytes, :validate => :string
  # The maximum amount of time the server will block before answering the fetch request if
  # there isn't sufficient data to immediately satisfy `fetch_min_bytes`. This
  # should be less than or equal to the timeout used in `poll_timeout_ms`
  config :fetch_max_wait_ms, :validate => :string
  # The minimum amount of data the server should return for a fetch request. If insufficient
  # data is available the request will wait for that much data to accumulate
  # before answering the request.
  config :fetch_min_bytes, :validate => :string
  # The identifier of the group this consumer belongs to. Consumer group is a single logical subscriber
  # that happens to be made up of multiple processors. Messages in a topic will be distributed to all
  # Logstash instances with the same `group_id`
  config :group_id, :validate => :string, :default => "logstash"
  # The expected time between heartbeats to the consumer coordinator. Heartbeats are used to ensure 
  # that the consumer's session stays active and to facilitate rebalancing when new
  # consumers join or leave the group. The value must be set lower than
  # `session.timeout.ms`, but typically should be set no higher than 1/3 of that value.
  # It can be adjusted even lower to control the expected time for normal rebalances.
  config :heartbeat_interval_ms, :validate => :string
  # Java Class used to deserialize the record's key
  config :key_deserializer_class, :validate => :string, :default => "org.apache.kafka.common.serialization.StringDeserializer"
  # The maximum delay between invocations of poll() when using consumer group management. This places 
  # an upper bound on the amount of time that the consumer can be idle before fetching more records. 
  # If poll() is not called before expiration of this timeout, then the consumer is considered failed and 
  # the group will rebalance in order to reassign the partitions to another member.
  # The value of the configuration `request_timeout_ms` must always be larger than max_poll_interval_ms
  config :max_poll_interval_ms, :validate => :string
  # The maximum amount of data per-partition the server will return. The maximum total memory used for a
  # request will be <code>#partitions * max.partition.fetch.bytes</code>. This size must be at least
  # as large as the maximum message size the server allows or else it is possible for the producer to
  # send messages larger than the consumer can fetch. If that happens, the consumer can get stuck trying
  # to fetch a large message on a certain partition.
  config :max_partition_fetch_bytes, :validate => :string
  # The maximum number of records returned in a single call to poll().
  config :max_poll_records, :validate => :string
  # The period of time in milliseconds after which we force a refresh of metadata even if
  # we haven't seen any partition leadership changes to proactively discover any new brokers or partitions
  config :metadata_max_age_ms, :validate => :string
  # The class name of the partition assignment strategy that the client will use to distribute
  # partition ownership amongst consumer instances
  config :partition_assignment_strategy, :validate => :string
  # The size of the TCP receive buffer (SO_RCVBUF) to use when reading data.
  config :receive_buffer_bytes, :validate => :string
  # The amount of time to wait before attempting to reconnect to a given host.
  # This avoids repeatedly connecting to a host in a tight loop.
  # This backoff applies to all requests sent by the consumer to the broker.
  config :reconnect_backoff_ms, :validate => :string
  # The configuration controls the maximum amount of time the client will wait
  # for the response of a request. If the response is not received before the timeout
  # elapses the client will resend the request if necessary or fail the request if
  # retries are exhausted.
  config :request_timeout_ms, :validate => :string
  # The amount of time to wait before attempting to retry a failed fetch request
  # to a given topic partition. This avoids repeated fetching-and-failing in a tight loop.
  config :retry_backoff_ms, :validate => :string
  # The size of the TCP send buffer (SO_SNDBUF) to use when sending data
  config :send_buffer_bytes, :validate => :string
  # The timeout after which, if the `poll_timeout_ms` is not invoked, the consumer is marked dead
  # and a rebalance operation is triggered for the group identified by `group_id`
  config :session_timeout_ms, :validate => :string
  # Java Class used to deserialize the record's value
  config :value_deserializer_class, :validate => :string, :default => "org.apache.kafka.common.serialization.StringDeserializer"
  # A list of topics to subscribe to, defaults to ["logstash"].
  config :topics, :validate => :array, :default => ["logstash"]
  # A topic regex pattern to subscribe to. 
  # The topics configuration will be ignored when using this configuration.
  config :topics_pattern, :validate => :string
  # Time kafka consumer will wait to receive new messages from topics
  config :poll_timeout_ms, :validate => :number, :default => 100
  # The truststore type.
  config :ssl_truststore_type, :validate => :string
  # The JKS truststore path to validate the Kafka broker's certificate.
  config :ssl_truststore_location, :validate => :path
  # The truststore password
  config :ssl_truststore_password, :validate => :password
  # The keystore type.
  config :ssl_keystore_type, :validate => :string
  # If client authentication is required, this setting stores the keystore path.
  config :ssl_keystore_location, :validate => :path
  # If client authentication is required, this setting stores the keystore password
  config :ssl_keystore_password, :validate => :password
  # The password of the private key in the key store file.
  config :ssl_key_password, :validate => :password
  # Algorithm to use when verifying host. Set to "" to disable
  config :ssl_endpoint_identification_algorithm, :validate => :string, :default => 'https'
  # Security protocol to use, which can be either of PLAINTEXT,SSL,SASL_PLAINTEXT,SASL_SSL
  config :security_protocol, :validate => ["PLAINTEXT", "SSL", "SASL_PLAINTEXT", "SASL_SSL"], :default => "PLAINTEXT"
  # http://kafka.apache.org/documentation.html#security_sasl[SASL mechanism] used for client connections. 
  # This may be any mechanism for which a security provider is available.
  # GSSAPI is the default mechanism.
  config :sasl_mechanism, :validate => :string, :default => "GSSAPI"
  # The Kerberos principal name that Kafka broker runs as. 
  # This can be defined either in Kafka's JAAS config or in Kafka's config.
  config :sasl_kerberos_service_name, :validate => :string
  # The Java Authentication and Authorization Service (JAAS) API supplies user authentication and authorization 
  # services for Kafka. This setting provides the path to the JAAS file. Sample JAAS file for Kafka client:
  # [source,java]
  # ----------------------------------
  # KafkaClient {
  #   com.sun.security.auth.module.Krb5LoginModule required
  #   useTicketCache=true
  #   renewTicket=true
  #   serviceName="kafka";
  #   };
  # ----------------------------------
  #
  # Please note that specifying `jaas_path` and `kerberos_config` in the config file will add these  
  # to the global JVM system properties. This means if you have multiple Kafka inputs, all of them would be sharing the same 
  # `jaas_path` and `kerberos_config`. If this is not desirable, you would have to run separate instances of Logstash on 
  # different JVM instances.
  config :jaas_path, :validate => :path
  # JAAS configuration settings. This allows JAAS config to be a part of the plugin configuration and allows for different JAAS configuration per each plugin config.
  config :sasl_jaas_config, :validate => :string
  # Optional path to kerberos config file. This is krb5.conf style as detailed in https://web.mit.edu/kerberos/krb5-1.12/doc/admin/conf_files/krb5_conf.html
  config :kerberos_config, :validate => :path
  # Option to add Kafka metadata like topic, message size to the event.
  # This will add a field named `kafka` to the logstash event containing the following attributes:
  #   `topic`: The topic this message is associated with
  #   `consumer_group`: The consumer group used to read in this event
  #   `partition`: The partition this message is associated with
  #   `offset`: The offset from the partition this message is associated with
  #   `key`: A ByteBuffer containing the message key
  #   `timestamp`: The timestamp of this message
  config :decorate_events, :validate => :boolean, :default => false


  public
  def register
    @runner_threads = []
  end # def register

  public
  def run(logstash_queue)
    @runner_consumers = consumer_threads.times.map { |i| create_consumer("#{client_id}-#{i}") }
    @runner_threads = @runner_consumers.map { |consumer| thread_runner(logstash_queue, consumer) }
    @runner_threads.each { |t| t.join }
  end # def run

  public
  def stop
    # if we have consumers, wake them up to unblock our runner threads
    @runner_consumers && @runner_consumers.each(&:wakeup)
  end

  public
  def kafka_consumers
    @runner_consumers
  end

  private
  def thread_runner(logstash_queue, consumer)
    Thread.new do
      begin
        unless @topics_pattern.nil?
          nooplistener = org.apache.kafka.clients.consumer.internals.NoOpConsumerRebalanceListener.new
          pattern = java.util.regex.Pattern.compile(@topics_pattern)
          consumer.subscribe(pattern, nooplistener)
        else
          consumer.subscribe(topics);
        end
        codec_instance = @codec.clone
        while !stop?
          records = consumer.poll(poll_timeout_ms)
          next unless records.count > 0
          for record in records do
            codec_instance.decode(record.value.to_s) do |event|
              decorate(event)
              if @decorate_events
                event.set("[@metadata][kafka][topic]", record.topic)
                event.set("[@metadata][kafka][consumer_group]", @group_id)
                event.set("[@metadata][kafka][partition]", record.partition)
                event.set("[@metadata][kafka][offset]", record.offset)
                event.set("[@metadata][kafka][key]", record.key)
                event.set("[@metadata][kafka][timestamp]", record.timestamp)
              end
              logstash_queue << event
            end
          end
          # Manual offset commit
          if @enable_auto_commit == "false"
            consumer.commitSync
          end
        end
      rescue org.apache.kafka.common.errors.WakeupException => e
        raise e if !stop?
      ensure
        consumer.close
      end
    end
  end

  private
  def create_consumer(client_id)
    begin
      props = java.util.Properties.new
      kafka = org.apache.kafka.clients.consumer.ConsumerConfig

      props.put(kafka::AUTO_COMMIT_INTERVAL_MS_CONFIG, auto_commit_interval_ms)
      props.put(kafka::AUTO_OFFSET_RESET_CONFIG, auto_offset_reset) unless auto_offset_reset.nil?
      props.put(kafka::BOOTSTRAP_SERVERS_CONFIG, bootstrap_servers)
      props.put(kafka::CHECK_CRCS_CONFIG, check_crcs) unless check_crcs.nil?
      props.put(kafka::CLIENT_ID_CONFIG, client_id)
      props.put(kafka::CONNECTIONS_MAX_IDLE_MS_CONFIG, connections_max_idle_ms) unless connections_max_idle_ms.nil?
      props.put(kafka::ENABLE_AUTO_COMMIT_CONFIG, enable_auto_commit)
      props.put(kafka::EXCLUDE_INTERNAL_TOPICS_CONFIG, exclude_internal_topics) unless exclude_internal_topics.nil?
      props.put(kafka::FETCH_MAX_BYTES_CONFIG, fetch_max_bytes) unless fetch_max_bytes.nil?
      props.put(kafka::FETCH_MAX_WAIT_MS_CONFIG, fetch_max_wait_ms) unless fetch_max_wait_ms.nil?
      props.put(kafka::FETCH_MIN_BYTES_CONFIG, fetch_min_bytes) unless fetch_min_bytes.nil?
      props.put(kafka::GROUP_ID_CONFIG, group_id)
      props.put(kafka::HEARTBEAT_INTERVAL_MS_CONFIG, heartbeat_interval_ms) unless heartbeat_interval_ms.nil?
      props.put(kafka::KEY_DESERIALIZER_CLASS_CONFIG, key_deserializer_class)
      props.put(kafka::MAX_PARTITION_FETCH_BYTES_CONFIG, max_partition_fetch_bytes) unless max_partition_fetch_bytes.nil?
      props.put(kafka::MAX_POLL_RECORDS_CONFIG, max_poll_records) unless max_poll_records.nil?
      props.put(kafka::MAX_POLL_INTERVAL_MS_CONFIG, max_poll_interval_ms) unless max_poll_interval_ms.nil?
      props.put(kafka::METADATA_MAX_AGE_CONFIG, metadata_max_age_ms) unless metadata_max_age_ms.nil?
      props.put(kafka::PARTITION_ASSIGNMENT_STRATEGY_CONFIG, partition_assignment_strategy) unless partition_assignment_strategy.nil?
      props.put(kafka::RECEIVE_BUFFER_CONFIG, receive_buffer_bytes) unless receive_buffer_bytes.nil?
      props.put(kafka::RECONNECT_BACKOFF_MS_CONFIG, reconnect_backoff_ms) unless reconnect_backoff_ms.nil?
      props.put(kafka::REQUEST_TIMEOUT_MS_CONFIG, request_timeout_ms) unless request_timeout_ms.nil?
      props.put(kafka::RETRY_BACKOFF_MS_CONFIG, retry_backoff_ms) unless retry_backoff_ms.nil?
      props.put(kafka::SEND_BUFFER_CONFIG, send_buffer_bytes) unless send_buffer_bytes.nil?
      props.put(kafka::SESSION_TIMEOUT_MS_CONFIG, session_timeout_ms) unless session_timeout_ms.nil?
      props.put(kafka::VALUE_DESERIALIZER_CLASS_CONFIG, value_deserializer_class)

      props.put("security.protocol", security_protocol) unless security_protocol.nil?

      if security_protocol == "SSL"
        set_trustore_keystore_config(props)
      elsif security_protocol == "SASL_PLAINTEXT"
        set_sasl_config(props)
      elsif security_protocol == "SASL_SSL"
        set_trustore_keystore_config(props)
        set_sasl_config(props)
      end

      org.apache.kafka.clients.consumer.KafkaConsumer.new(props)
    rescue => e
      logger.error("Unable to create Kafka consumer from given configuration",
                   :kafka_error_message => e,
                   :cause => e.respond_to?(:getCause) ? e.getCause() : nil)
      raise e
    end
  end

  def set_trustore_keystore_config(props)
    props.put("ssl.truststore.type", ssl_truststore_type) unless ssl_truststore_type.nil?
    props.put("ssl.truststore.location", ssl_truststore_location) unless ssl_truststore_location.nil?
    props.put("ssl.truststore.password", ssl_truststore_password.value) unless ssl_truststore_password.nil?

    # Client auth stuff
    props.put("ssl.keystore.type", ssl_keystore_type) unless ssl_keystore_type.nil?
    props.put("ssl.key.password", ssl_key_password.value) unless ssl_key_password.nil?
    props.put("ssl.keystore.location", ssl_keystore_location) unless ssl_keystore_location.nil?
    props.put("ssl.keystore.password", ssl_keystore_password.value) unless ssl_keystore_password.nil?
    props.put("ssl.endpoint.identification.algorithm", ssl_endpoint_identification_algorithm) unless ssl_endpoint_identification_algorithm.nil?
  end

  def set_sasl_config(props)
    java.lang.System.setProperty("java.security.auth.login.config",jaas_path) unless jaas_path.nil?
    java.lang.System.setProperty("java.security.krb5.conf",kerberos_config) unless kerberos_config.nil?

    props.put("sasl.mechanism",sasl_mechanism)
    if sasl_mechanism == "GSSAPI" && sasl_kerberos_service_name.nil?
      raise LogStash::ConfigurationError, "sasl_kerberos_service_name must be specified when SASL mechanism is GSSAPI"
    end

    props.put("sasl.kerberos.service.name",sasl_kerberos_service_name) unless sasl_kerberos_service_name.nil?
    props.put("sasl.jaas.config", sasl_jaas_config) unless sasl_jaas_config.nil?
  end
end #class LogStash::Inputs::Kafka
