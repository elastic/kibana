/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Span {
  kind: 'span';
  /**
   * Action holds the specific kind of event within the sub-type represented by the span (e.g. query, connect)
   */
  action?: null | string;
  /**
   * ChildIDs holds a list of successor transactions and/or spans.
   */
  child_ids?: null | string[];
  /**
   * Composite holds details on a group of spans represented by a single one.
   */
  composite?: null | {
    /**
     * A string value indicating which compression strategy was used. The valid values are `exact_match` and `same_kind`.
     */
    compression_strategy: string;
    /**
     * Count is the number of compressed spans the composite span represents. The minimum count is 2, as a composite span represents at least two spans.
     */
    count: number;
    /**
     * Sum is the durations of all compressed spans this composite span represents in milliseconds.
     */
    sum: number;
    [k: string]: unknown;
  };
  /**
   * Context holds arbitrary contextual information for the event.
   */
  context?: null | {
    /**
     * Database contains contextual data for database spans
     */
    db?: null | {
      /**
       * Instance name of the database.
       */
      instance?: null | string;
      /**
       * Link to the database server.
       */
      link?: null | string;
      /**
       * RowsAffected shows the number of rows affected by the statement.
       */
      rows_affected?: null | number;
      /**
       * Statement of the recorded database event, e.g. query.
       */
      statement?: null | string;
      /**
       * Type of the recorded database event., e.g. sql, cassandra, hbase, redis.
       */
      type?: null | string;
      /**
       * User is the username with which the database is accessed.
       */
      user?: null | string;
      [k: string]: unknown;
    };
    /**
     * Destination contains contextual data about the destination of spans
     */
    destination?: null | {
      /**
       * Address is the destination network address: hostname (e.g. 'localhost'), FQDN (e.g. 'elastic.co'), IPv4 (e.g. '127.0.0.1') IPv6 (e.g. '::1')
       */
      address?: null | string;
      /**
       * Port is the destination network port (e.g. 443)
       */
      port?: null | number;
      /**
       * Service describes the destination service
       */
      service?: null | {
        /**
         * Name is the identifier for the destination service, e.g. 'http://elastic.co', 'elasticsearch', 'rabbitmq' ( DEPRECATED: this field will be removed in a future release
         */
        name?: null | string;
        /**
         * Resource identifies the destination service resource being operated on e.g. 'http://elastic.co:80', 'elasticsearch', 'rabbitmq/queue_name' DEPRECATED: this field will be removed in a future release
         */
        resource: string;
        /**
         * Type of the destination service, e.g. db, elasticsearch. Should typically be the same as span.type. DEPRECATED: this field will be removed in a future release
         */
        type?: null | string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    /**
     * HTTP contains contextual information when the span concerns an HTTP request.
     */
    http?: null | {
      /**
       * Method holds information about the method of the HTTP request.
       */
      method?: null | string;
      /**
       * Response describes the HTTP response information in case the event was created as a result of an HTTP request.
       */
      response?: null | {
        /**
         * DecodedBodySize holds the size of the decoded payload.
         */
        decoded_body_size?: null | number;
        /**
         * EncodedBodySize holds the size of the encoded payload.
         */
        encoded_body_size?: null | number;
        /**
         * Headers holds the http headers sent in the http response.
         */
        headers?: null | {
          /**
           * This interface was referenced by `undefined`'s JSON-Schema definition
           * via the `patternProperty` "[.*]*$".
           */
          [k: string]: null | string[] | string;
        };
        /**
         * StatusCode sent in the http response.
         */
        status_code?: null | number;
        /**
         * TransferSize holds the total size of the payload.
         */
        transfer_size?: null | number;
        [k: string]: unknown;
      };
      /**
       * Deprecated: Use Response.StatusCode instead. StatusCode sent in the http response.
       */
      status_code?: null | number;
      /**
       * URL is the raw url of the correlating HTTP request.
       */
      url?: null | string;
      [k: string]: unknown;
    };
    /**
     * Message holds details related to message receiving and publishing if the captured event integrates with a messaging system
     */
    message?: null | {
      /**
       * Age of the message. If the monitored messaging framework provides a timestamp for the message, agents may use it. Otherwise, the sending agent can add a timestamp in milliseconds since the Unix epoch to the message's metadata to be retrieved by the receiving agent. If a timestamp is not available, agents should omit this field.
       */
      age?: null | {
        /**
         * Age of the message in milliseconds.
         */
        ms?: null | number;
        [k: string]: unknown;
      };
      /**
       * Body of the received message, similar to an HTTP request body
       */
      body?: null | string;
      /**
       * Headers received with the message, similar to HTTP request headers.
       */
      headers?: null | {
        /**
         * This interface was referenced by `undefined`'s JSON-Schema definition
         * via the `patternProperty` "[.*]*$".
         */
        [k: string]: null | string[] | string;
      };
      /**
       * Queue holds information about the message queue where the message is received.
       */
      queue?: null | {
        /**
         * Name holds the name of the message queue where the message is received.
         */
        name?: null | string;
        [k: string]: unknown;
      };
      /**
       * RoutingKey holds the optional routing key of the received message as set on the queuing system, such as in RabbitMQ.
       */
      routing_key?: null | string;
      [k: string]: unknown;
    };
    /**
     * Service related information can be sent per span. Information provided here will override the more generic information retrieved from metadata, missing service fields will be retrieved from the metadata information.
     */
    service?: null | {
      /**
       * Agent holds information about the APM agent capturing the event.
       */
      agent?: null | {
        /**
         * EphemeralID is a free format ID used for metrics correlation by agents
         */
        ephemeral_id?: null | string;
        /**
         * Name of the APM agent capturing information.
         */
        name?: null | string;
        /**
         * Version of the APM agent capturing information.
         */
        version?: null | string;
        [k: string]: unknown;
      };
      /**
       * Environment in which the monitored service is running, e.g. `production` or `staging`.
       */
      environment?: null | string;
      /**
       * Framework holds information about the framework used in the monitored service.
       */
      framework?: null | {
        /**
         * Name of the used framework
         */
        name?: null | string;
        /**
         * Version of the used framework
         */
        version?: null | string;
        [k: string]: unknown;
      };
      /**
       * ID holds a unique identifier for the service.
       */
      id?: null | string;
      /**
       * Language holds information about the programming language of the monitored service.
       */
      language?: null | {
        /**
         * Name of the used programming language
         */
        name?: null | string;
        /**
         * Version of the used programming language
         */
        version?: null | string;
        [k: string]: unknown;
      };
      /**
       * Name of the monitored service.
       */
      name?: null | string;
      /**
       * Node must be a unique meaningful name of the service node.
       */
      node?: null | {
        /**
         * Name of the service node
         */
        configured_name?: null | string;
        [k: string]: unknown;
      };
      /**
       * Origin contains the self-nested field groups for service.
       */
      origin?: null | {
        /**
         * Immutable id of the service emitting this event.
         */
        id?: null | string;
        /**
         * Immutable name of the service emitting this event.
         */
        name?: null | string;
        /**
         * The version of the service the data was collected from.
         */
        version?: null | string;
        [k: string]: unknown;
      };
      /**
       * Runtime holds information about the language runtime running the monitored service
       */
      runtime?: null | {
        /**
         * Name of the language runtime
         */
        name?: null | string;
        /**
         * Version of the language runtime
         */
        version?: null | string;
        [k: string]: unknown;
      };
      /**
       * Target holds information about the outgoing service in case of an outgoing event
       */
      target?: (
        | {
            type: string;
            [k: string]: unknown;
          }
        | {
            name: string;
            [k: string]: unknown;
          }
      ) &
        (
          | ((
              | {
                  type: string;
                  [k: string]: unknown;
                }
              | {
                  name: string;
                  [k: string]: unknown;
                }
            ) &
              null)
          | (
              | {
                  type: string;
                  [k: string]: unknown;
                }
              | {
                  name: string;
                  [k: string]: unknown;
                }
            )
        );
      /**
       * Version of the monitored service.
       */
      version?: null | string;
      [k: string]: unknown;
    };
    /**
     * Tags are a flat mapping of user-defined tags. On the agent side, tags are called labels. Allowed value types are string, boolean and number values. Tags are indexed and searchable.
     */
    tags?: null | {
      [k: string]: null | string | boolean | number;
    };
    [k: string]: unknown;
  };
  /**
   * Duration of the span in milliseconds. When the span is a composite one, duration is the gross duration, including "whitespace" in between spans.
   */
  duration: number;
  /**
   * ID holds the hex encoded 64 random bits ID of the event.
   */
  id: string;
  /**
   * Links holds links to other spans, potentially in other traces.
   */
  links?: null | Array<{
    /**
     * SpanID holds the ID of the linked span.
     */
    span_id: string;
    /**
     * TraceID holds the ID of the linked span's trace.
     */
    trace_id: string;
    [k: string]: unknown;
  }>;
  /**
   * Name is the generic designation of a span in the scope of a transaction.
   */
  name: string;
  /**
   * OTel contains unmapped OpenTelemetry attributes.
   */
  otel?: null | {
    /**
     * Attributes hold the unmapped OpenTelemetry attributes.
     */
    attributes?: null | {
      [k: string]: unknown;
    };
    /**
     * SpanKind holds the incoming OpenTelemetry span kind.
     */
    span_kind?: null | string;
    [k: string]: unknown;
  };
  /**
   * Outcome of the span: success, failure, or unknown. Outcome may be one of a limited set of permitted values describing the success or failure of the span. It can be used for calculating error rates for outgoing requests.
   */
  outcome?: 'success' | 'failure' | 'unknown' | null;
  /**
   * ParentID holds the hex encoded 64 random bits ID of the parent transaction or span.
   */
  parent_id: string;
  /**
   * SampleRate applied to the monitored service at the time where this span was recorded.
   */
  sample_rate?: null | number;
  /**
   * Stacktrace connected to this span event.
   */
  stacktrace?: null | Array<
    | {
        classname: string;
        [k: string]: unknown;
      }
    | {
        filename: string;
        [k: string]: unknown;
      }
  >;
  /**
   * Describes the event used by the Mobile SDKs: ApplicationLifecycle, Breadcrumb, Crash, Application Opened.
   */
  event?: null | {
    name: string;
  };
  /**
   * Start is the offset relative to the transaction's timestamp identifying the start of the span, in milliseconds.
   */
  start?: null | number;
  /**
   * Subtype is a further sub-division of the type (e.g. postgresql, elasticsearch)
   */
  subtype?: null | string;
  /**
   * Sync indicates whether the span was executed synchronously or asynchronously.
   */
  sync?: null | boolean;
  /**
   * Timestamp holds the recorded time of the event, UTC based and formatted as microseconds since Unix epoch
   */
  timestamp?: null | number;
  /**
   * TraceID holds the hex encoded 128 random bits ID of the correlated trace.
   */
  trace_id: string;
  /**
   * TransactionID holds the hex encoded 64 random bits ID of the correlated transaction.
   */
  transaction_id?: null | string;
  /**
   * Type holds the span's type, and can have specific keywords within the service's domain (eg: 'request', 'backgroundjob', etc)
   */
  type: string;
  [k: string]: unknown;
}
