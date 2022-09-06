/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Transaction {
  kind: 'transaction';
  /**
   * Context holds arbitrary contextual information for the event.
   */
  context?: null | {
    /**
     * Cloud holds fields related to the cloud or infrastructure the events are coming from.
     */
    cloud?: null | {
      /**
       * Origin contains the self-nested field groups for cloud.
       */
      origin?: null | {
        /**
         * The cloud account or organization id used to identify different entities in a multi-tenant environment.
         */
        account?: null | {
          /**
           * The cloud account or organization id used to identify different entities in a multi-tenant environment.
           */
          id?: null | string;
          [k: string]: unknown;
        };
        /**
         * Name of the cloud provider.
         */
        provider?: null | string;
        /**
         * Region in which this host, resource, or service is located.
         */
        region?: null | string;
        /**
         * The cloud service name is intended to distinguish services running on different platforms within a provider.
         */
        service?: null | {
          /**
           * The cloud service name is intended to distinguish services running on different platforms within a provider.
           */
          name?: null | string;
          [k: string]: unknown;
        };
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    /**
     * Custom can contain additional metadata to be stored with the event. The format is unspecified and can be deeply nested objects. The information will not be indexed or searchable in Elasticsearch.
     */
    custom?: null | {
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
     * Page holds information related to the current page and page referers. It is only sent from RUM agents.
     */
    page?: null | {
      /**
       * Referer holds the URL of the page that 'linked' to the current page.
       */
      referer?: null | string;
      /**
       * URL of the current page
       */
      url?: null | string;
      [k: string]: unknown;
    };
    /**
     * Request describes the HTTP request information in case the event was created as a result of an HTTP request.
     */
    request?: null | {
      /**
       * Body only contais the request bod, not the query string information. It can either be a dictionary (for standard HTTP requests) or a raw request body.
       */
      body?:
        | null
        | string
        | {
            [k: string]: unknown;
          };
      /**
       * Cookies used by the request, parsed as key-value objects.
       */
      cookies?: null | {
        [k: string]: unknown;
      };
      /**
       * Env holds environment variable information passed to the monitored service.
       */
      env?: null | {
        [k: string]: unknown;
      };
      /**
       * Headers includes any HTTP headers sent by the requester. Cookies will be taken by headers if supplied.
       */
      headers?: null | {
        /**
         * This interface was referenced by `undefined`'s JSON-Schema definition
         * via the `patternProperty` "[.*]*$".
         */
        [k: string]: null | string[] | string;
      };
      /**
       * HTTPVersion holds information about the used HTTP version.
       */
      http_version?: null | string;
      /**
       * Method holds information about the method of the HTTP request.
       */
      method: string;
      /**
       * Socket holds information related to the recorded request, such as whether or not data were encrypted and the remote address.
       */
      socket?: null | {
        /**
         * Encrypted indicates whether a request was sent as TLS/HTTPS request. DEPRECATED: this field will be removed in a future release.
         */
        encrypted?: null | boolean;
        /**
         * RemoteAddress holds the network address sending the request. It should be obtained through standard APIs and not be parsed from any headers like 'Forwarded'.
         */
        remote_address?: null | string;
        [k: string]: unknown;
      };
      /**
       * URL holds information sucha as the raw URL, scheme, host and path.
       */
      url?: null | {
        /**
         * Full, possibly agent-assembled URL of the request, e.g. https://example.com:443/search?q=elasticsearch#top.
         */
        full?: null | string;
        /**
         * Hash of the request URL, e.g. 'top'
         */
        hash?: null | string;
        /**
         * Hostname information of the request, e.g. 'example.com'."
         */
        hostname?: null | string;
        /**
         * Path of the request, e.g. '/search'
         */
        pathname?: null | string;
        /**
         * Port of the request, e.g. '443'. Can be sent as string or int.
         */
        port?: null | string | number;
        /**
         * Protocol information for the recorded request, e.g. 'https:'.
         */
        protocol?: null | string;
        /**
         * Raw unparsed URL of the HTTP request line, e.g https://example.com:443/search?q=elasticsearch. This URL may be absolute or relative. For more details, see https://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html#sec5.1.2.
         */
        raw?: null | string;
        /**
         * Search contains the query string information of the request. It is expected to have values delimited by ampersands.
         */
        search?: null | string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
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
       * Finished indicates whether the response was finished or not.
       */
      finished?: null | boolean;
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
       * HeadersSent indicates whether http headers were sent.
       */
      headers_sent?: null | boolean;
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
     * Service related information can be sent per event. Information provided here will override the more generic information retrieved from metadata, missing service fields will be retrieved from the metadata information.
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
    /**
     * User holds information about the correlated user for this event. If user data are provided here, all user related information from metadata is ignored, otherwise the metadata's user information will be stored with the event.
     */
    user?: null | {
      /**
       * Domain of the logged in user
       */
      domain?: null | string;
      /**
       * Email of the user.
       */
      email?: null | string;
      /**
       * ID identifies the logged in user, e.g. can be the primary key of the user
       */
      id?: null | string | number;
      /**
       * Name of the user.
       */
      username?: null | string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  /**
   * DroppedSpanStats holds information about spans that were dropped (for example due to transaction_max_spans or exit_span_min_duration).
   */
  dropped_spans_stats?: null | Array<{
    /**
     * DestinationServiceResource identifies the destination service resource being operated on. e.g. 'http://elastic.co:80', 'elasticsearch', 'rabbitmq/queue_name'.
     */
    destination_service_resource?: null | string;
    /**
     * Duration holds duration aggregations about the dropped span.
     */
    duration?: null | {
      /**
       * Count holds the number of times the dropped span happened.
       */
      count?: null | number;
      /**
       * Sum holds dimensions about the dropped span's duration.
       */
      sum?: null | {
        /**
         * Us represents the summation of the span duration.
         */
        us?: null | number;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    /**
     * Outcome of the span: success, failure, or unknown. Outcome may be one of a limited set of permitted values describing the success or failure of the span. It can be used for calculating error rates for outgoing requests.
     */
    outcome?: 'success' | 'failure' | 'unknown' | null;
    /**
     * ServiceTargetName identifies the instance name of the target service being operated on
     */
    service_target_name?: null | string;
    /**
     * ServiceTargetType identifies the type of the target service being operated on e.g. 'oracle', 'rabbitmq'
     */
    service_target_type?: null | string;
    [k: string]: unknown;
  }>;
  /**
   * Duration how long the transaction took to complete, in milliseconds with 3 decimal points.
   */
  duration: number;
  /**
   * UserExperience holds metrics for measuring real user experience. This information is only sent by RUM agents.
   */
  experience?: null | {
    /**
     * CumulativeLayoutShift holds the Cumulative Layout Shift (CLS) metric value, or a negative value if CLS is unknown. See https://web.dev/cls/
     */
    cls?: null | number;
    /**
     * FirstInputDelay holds the First Input Delay (FID) metric value, or a negative value if FID is unknown. See https://web.dev/fid/
     */
    fid?: null | number;
    /**
     * Longtask holds longtask duration/count metrics.
     */
    longtask?: null | {
      /**
       * Count is the total number of of longtasks.
       */
      count: number;
      /**
       * Max longtask duration
       */
      max: number;
      /**
       * Sum of longtask durations
       */
      sum: number;
      [k: string]: unknown;
    };
    /**
     * TotalBlockingTime holds the Total Blocking Time (TBT) metric value, or a negative value if TBT is unknown. See https://web.dev/tbt/
     */
    tbt?: null | number;
    [k: string]: unknown;
  };
  /**
   * FAAS holds fields related to Function as a Service events.
   */
  faas?: null | {
    /**
     * Indicates whether a function invocation was a cold start or not.
     */
    coldstart?: null | boolean;
    /**
     * The request id of the function invocation.
     */
    execution?: null | string;
    /**
     * A unique identifier of the invoked serverless function.
     */
    id?: null | string;
    /**
     * The lambda function name.
     */
    name?: null | string;
    /**
     * Trigger attributes.
     */
    trigger?: null | {
      /**
       * The id of the origin trigger request.
       */
      request_id?: null | string;
      /**
       * The trigger type.
       */
      type?: null | string;
      [k: string]: unknown;
    };
    /**
     * The lambda function version.
     */
    version?: null | string;
    [k: string]: unknown;
  };
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
   * Marks capture the timing of a significant event during the lifetime of a transaction. Marks are organized into groups and can be set by the user or the agent. Marks are only reported by RUM agents.
   */
  marks?: null | {
    [k: string]: null | {
      [k: string]: null | number;
    };
  };
  /**
   * Name is the generic designation of a transaction in the scope of a single service, eg: 'GET /users/:id'.
   */
  name?: null | string;
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
   * Outcome of the transaction with a limited set of permitted values, describing the success or failure of the transaction from the service's perspective. It is used for calculating error rates for incoming requests. Permitted values: success, failure, unknown.
   */
  outcome?: 'success' | 'failure' | 'unknown' | null;
  /**
   * ParentID holds the hex encoded 64 random bits ID of the parent transaction or span.
   */
  parent_id?: null | string;
  /**
   * Result of the transaction. For HTTP-related transactions, this should be the status code formatted like 'HTTP 2xx'.
   */
  result?: null | string;
  /**
   * SampleRate applied to the monitored service at the time where this transaction was recorded. Allowed values are [0..1]. A SampleRate <1 indicates that not all spans are recorded.
   */
  sample_rate?: null | number;
  /**
   * Sampled indicates whether or not the full information for a transaction is captured. If a transaction is unsampled no spans and less context information will be reported.
   */
  sampled?: null | boolean;
  /**
   * Session holds optional transaction session information for RUM.
   */
  session?: null | {
    /**
     * ID holds a session ID for grouping a set of related transactions.
     */
    id: string;
    /**
     * Sequence holds an optional sequence number for a transaction within a session. It is not meaningful to compare sequences across two different sessions.
     */
    sequence?: null | number;
    [k: string]: unknown;
  };
  /**
   * SpanCount counts correlated spans.
   */
  span_count: {
    /**
     * Dropped is the number of correlated spans that have been dropped by the APM agent recording the transaction.
     */
    dropped?: null | number;
    /**
     * Started is the number of correlated spans that are recorded.
     */
    started: number;
    [k: string]: unknown;
  };
  /**
   * Timestamp holds the recorded time of the event, UTC based and formatted as microseconds since Unix epoch
   */
  timestamp?: null | number;
  /**
   * TraceID holds the hex encoded 128 random bits ID of the correlated trace.
   */
  trace_id: string;
  /**
   * Type expresses the transaction's type as keyword that has specific relevance within the service's domain, eg: 'request', 'backgroundjob'.
   */
  type: string;
  [k: string]: unknown;
}
