export const eventEcs = {
  action: {
    dashed_name: 'event-action',
    description: 'The action captured by the event.\n' +
      'This describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
    example: 'user-password-change',
    flat_name: 'event.action',
    ignore_above: 1024,
    level: 'core',
    name: 'action',
    normalize: [],
    short: 'The action captured by the event.',
    type: 'keyword'
  },
  agent_id_status: {
    dashed_name: 'event-agent-id-status',
    description: 'Agents are normally responsible for populating the `agent.id` field value. If the system receiving events is capable of validating the value based on authentication information for the client then this field can be used to reflect the outcome of that validation.\n' +
      "For example if the agent's connection is authenticated with mTLS and the client cert contains the ID of the agent to which the cert was issued then the `agent.id` value in events can be checked against the certificate. If the values match then `event.agent_id_status: verified` is added to the event, otherwise one of the other allowed values should be used.\n" +
      'If no validation is performed then the field should be omitted.\n' +
      'The allowed values are:\n' +
      '`verified` - The `agent.id` field value matches expected value obtained from auth metadata.\n' +
      '`mismatch` - The `agent.id` field value does not match the expected value obtained from auth metadata.\n' +
      '`missing` - There was no `agent.id` field in the event to validate.\n' +
      '`auth_metadata_missing` - There was no auth metadata or it was missing information about the agent ID.',
    example: 'verified',
    flat_name: 'event.agent_id_status',
    ignore_above: 1024,
    level: 'extended',
    name: 'agent_id_status',
    normalize: [],
    short: "Validation status of the event's agent.id field.",
    type: 'keyword'
  },
  category: {
    allowed_values: [
      {
        description: 'Events in this category are related to the challenge and response process in which credentials are supplied and verified to allow the creation of a session. Common sources for these logs are Windows event logs and ssh logs. Visualize and analyze events in this category to look for failed logins, and other authentication-related activity.',
        expected_event_types: [ 'start', 'end', 'info' ],
        name: 'authentication'
      },
      {
        description: 'Events in the configuration category have to deal with creating, modifying, or deleting the settings or parameters of an application, process, or system.\n' +
          'Example sources include security policy change logs, configuration auditing logging, and system integrity monitoring.',
        expected_event_types: [ 'access', 'change', 'creation', 'deletion', 'info' ],
        name: 'configuration'
      },
      {
        description: 'The database category denotes events and metrics relating to a data storage and retrieval system. Note that use of this category is not limited to relational database systems. Examples include event logs from MS SQL, MySQL, Elasticsearch, MongoDB, etc. Use this category to visualize and analyze database activity such as accesses and changes.',
        expected_event_types: [ 'access', 'change', 'info', 'error' ],
        name: 'database'
      },
      {
        description: 'Events in the driver category have to do with operating system device drivers and similar software entities such as Windows drivers, kernel extensions, kernel modules, etc.\n' +
          'Use events and metrics in this category to visualize and analyze driver-related activity and status on hosts.',
        expected_event_types: [ 'change', 'end', 'info', 'start' ],
        name: 'driver'
      },
      {
        description: 'This category is used for events relating to email messages, email attachments, and email network or protocol activity.\n' +
          'Emails events can be produced by email security gateways, mail transfer agents, email cloud service providers, or mail server monitoring applications.',
        expected_event_types: [ 'info' ],
        name: 'email'
      },
      {
        description: 'Relating to a set of information that has been created on, or has existed on a filesystem. Use this category of events to visualize and analyze the creation, access, and deletions of files. Events in this category can come from both host-based and network-based sources. An example source of a network-based detection of a file transfer would be the Zeek file.log.',
        expected_event_types: [ 'change', 'creation', 'deletion', 'info' ],
        name: 'file'
      },
      {
        description: 'Use this category to visualize and analyze information such as host inventory or host lifecycle events.\n' +
          `Most of the events in this category can usually be observed from the outside, such as from a hypervisor or a control plane's point of view. Some can also be seen from within, such as "start" or "end".\n` +
          'Note that this category is for information about hosts themselves; it is not meant to capture activity "happening on a host".',
        expected_event_types: [ 'access', 'change', 'end', 'info', 'start' ],
        name: 'host'
      },
      {
        description: 'Identity and access management (IAM) events relating to users, groups, and administration. Use this category to visualize and analyze IAM-related logs and data from active directory, LDAP, Okta, Duo, and other IAM systems.',
        expected_event_types: [
          'admin',    'change',
          'creation', 'deletion',
          'group',    'info',
          'user'
        ],
        name: 'iam'
      },
      {
        description: 'Relating to intrusion detections from IDS/IPS systems and functions, both network and host-based. Use this category to visualize and analyze intrusion detection alerts from systems such as Snort, Suricata, and Palo Alto threat detections.',
        expected_event_types: [ 'allowed', 'denied', 'info' ],
        name: 'intrusion_detection'
      },
      {
        description: 'Malware detection events and alerts. Use this category to visualize and analyze malware detections from EDR/EPP systems such as Elastic Endpoint Security, Symantec Endpoint Protection, Crowdstrike, and network IDS/IPS systems such as Suricata, or other sources of malware-related events such as Palo Alto Networks threat logs and Wildfire logs.',
        expected_event_types: [ 'info' ],
        name: 'malware'
      },
      {
        description: 'Relating to all network activity, including network connection lifecycle, network traffic, and essentially any event that includes an IP address. Many events containing decoded network protocol transactions fit into this category. Use events in this category to visualize or analyze counts of network ports, protocols, addresses, geolocation information, etc.',
        expected_event_types: [
          'access',
          'allowed',
          'connection',
          'denied',
          'end',
          'info',
          'protocol',
          'start'
        ],
        name: 'network'
      },
      {
        description: 'Relating to software packages installed on hosts. Use this category to visualize and analyze inventory of software installed on various hosts, or to determine host vulnerability in the absence of vulnerability scan data.',
        expected_event_types: [
          'access',
          'change',
          'deletion',
          'info',
          'installation',
          'start'
        ],
        name: 'package'
      },
      {
        description: 'Use this category of events to visualize and analyze process-specific information such as lifecycle events or process ancestry.',
        expected_event_types: [ 'access', 'change', 'end', 'info', 'start' ],
        name: 'process'
      },
      {
        description: 'Having to do with settings and assets stored in the Windows registry. Use this category to visualize and analyze activity such as registry access and modifications.',
        expected_event_types: [ 'access', 'change', 'creation', 'deletion' ],
        name: 'registry'
      },
      {
        description: 'The session category is applied to events and metrics regarding logical persistent connections to hosts and services. Use this category to visualize and analyze interactive or automated persistent connections between assets. Data for this category may come from Windows Event logs, SSH logs, or stateless sessions such as HTTP cookie-based sessions, etc.',
        expected_event_types: [ 'start', 'end', 'info' ],
        name: 'session'
      },
      {
        description: "Use this category to visualize and analyze events describing threat actors' targets, motives, or behaviors.",
        expected_event_types: [ 'indicator' ],
        name: 'threat'
      },
      {
        description: 'Relating to web server access. Use this category to create a dashboard of web server/proxy activity from apache, IIS, nginx web servers, etc. Note: events from network observers such as Zeek http log may also be included in this category.',
        expected_event_types: [ 'access', 'error', 'info' ],
        name: 'web'
      }
    ],
    dashed_name: 'event-category',
    description: 'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n' +
      '`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\n' +
      'This field is an array. This will allow proper categorization of some events that fall in multiple categories.',
    example: 'authentication',
    flat_name: 'event.category',
    ignore_above: 1024,
    level: 'core',
    name: 'category',
    normalize: [ 'array' ],
    short: 'Event category. The second categorization field in the hierarchy.',
    type: 'keyword'
  },
  code: {
    dashed_name: 'event-code',
    description: 'Identification code for this event, if one exists.\n' +
      'Some event sources use event codes to identify messages unambiguously, regardless of message language or wording adjustments over time. An example of this is the Windows Event ID.',
    example: 4648,
    flat_name: 'event.code',
    ignore_above: 1024,
    level: 'extended',
    name: 'code',
    normalize: [],
    short: 'Identification code for this event.',
    type: 'keyword'
  },
  created: {
    dashed_name: 'event-created',
    description: 'event.created contains the date/time when the event was first read by an agent, or by your pipeline.\n' +
      'This field is distinct from @timestamp in that @timestamp typically contain the time extracted from the original event.\n' +
      "In most situations, these two timestamps will be slightly different. The difference can be used to calculate the delay between your source generating an event, and the time when your agent first processed it. This can be used to monitor your agent's or pipeline's ability to keep up with your event source.\n" +
      'In case the two timestamps are identical, @timestamp should be used.',
    example: '2016-05-23T08:05:34.857Z',
    flat_name: 'event.created',
    level: 'core',
    name: 'created',
    normalize: [],
    short: 'Time when the event was first read by an agent or by your pipeline.',
    type: 'date'
  },
  dataset: {
    dashed_name: 'event-dataset',
    description: 'Name of the dataset.\n' +
      'If an event source publishes more than one type of log or events (e.g. access log, error log), the dataset is used to specify which one the event comes from.\n' +
      "It's recommended but not required to start the dataset name with the module name, followed by a dot, then the dataset name.",
    example: 'apache.access',
    flat_name: 'event.dataset',
    ignore_above: 1024,
    level: 'core',
    name: 'dataset',
    normalize: [],
    short: 'Name of the dataset.',
    type: 'keyword'
  },
  duration: {
    dashed_name: 'event-duration',
    description: 'Duration of the event in nanoseconds.\n' +
      'If event.start and event.end are known this value should be the difference between the end and start time.',
    flat_name: 'event.duration',
    format: 'duration',
    input_format: 'nanoseconds',
    level: 'core',
    name: 'duration',
    normalize: [],
    output_format: 'asMilliseconds',
    output_precision: 1,
    short: 'Duration of the event in nanoseconds.',
    type: 'long'
  },
  end: {
    dashed_name: 'event-end',
    description: 'event.end contains the date when the event ended or when the activity was last observed.',
    flat_name: 'event.end',
    level: 'extended',
    name: 'end',
    normalize: [],
    short: 'event.end contains the date when the event ended or when the activity was last observed.',
    type: 'date'
  },
  hash: {
    dashed_name: 'event-hash',
    description: 'Hash (perhaps logstash fingerprint) of raw field to be able to demonstrate log integrity.',
    example: '123456789012345678901234567890ABCD',
    flat_name: 'event.hash',
    ignore_above: 1024,
    level: 'extended',
    name: 'hash',
    normalize: [],
    short: 'Hash (perhaps logstash fingerprint) of raw field to be able to demonstrate log integrity.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'event-id',
    description: 'Unique ID to describe the event.',
    example: '8a4f500d',
    flat_name: 'event.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique ID to describe the event.',
    type: 'keyword'
  },
  ingested: {
    dashed_name: 'event-ingested',
    description: 'Timestamp when an event arrived in the central data store.\n' +
      "This is different from `@timestamp`, which is when the event originally occurred.  It's also different from `event.created`, which is meant to capture the first time an agent saw the event.\n" +
      'In normal conditions, assuming no tampering, the timestamps should chronologically look like this: `@timestamp` < `event.created` < `event.ingested`.',
    example: '2016-05-23T08:05:35.101Z',
    flat_name: 'event.ingested',
    level: 'core',
    name: 'ingested',
    normalize: [],
    short: 'Timestamp when an event arrived in the central data store.',
    type: 'date'
  },
  kind: {
    allowed_values: [
      {
        description: 'This value indicates an event such as an alert or notable event, triggered by a detection rule executing externally to the Elastic Stack.\n' +
          '`event.kind:alert` is often populated for events coming from firewalls, intrusion detection systems, endpoint detection and response systems, and so on.\n' +
          'This value is not used by Elastic solutions for alert documents that are created by rules executing within the Kibana alerting framework.',
        name: 'alert'
      },
      {
        description: 'The `enrichment` value indicates an event collected to provide additional context, often to other events.\n' +
          'An example is collecting indicators of compromise (IOCs) from a threat intelligence provider with the intent to use those values to enrich other events. The IOC events from the intelligence provider should be categorized as `event.kind:enrichment`.',
        name: 'enrichment'
      },
      {
        description: 'This value is the most general and most common value for this field. It is used to represent events that indicate that something happened.',
        name: 'event'
      },
      {
        description: 'This value is used to indicate that this event describes a numeric measurement taken at given point in time.\n' +
          'Examples include CPU utilization, memory usage, or device temperature.\n' +
          'Metric events are often collected on a predictable frequency, such as once every few seconds, or once a minute, but can also be used to describe ad-hoc numeric metric queries.',
        name: 'metric'
      },
      {
        description: 'The state value is similar to metric, indicating that this event describes a measurement taken at given point in time, except that the measurement does not result in a numeric value, but rather one of a fixed set of categorical values that represent conditions or states.\n' +
          'Examples include periodic events reporting Elasticsearch cluster state (green/yellow/red), the state of a TCP connection (open, closed, fin_wait, etc.), the state of a host with respect to a software vulnerability (vulnerable, not vulnerable), and the state of a system regarding compliance with a regulatory standard (compliant, not compliant).\n' +
          "Note that an event that describes a change of state would not use `event.kind:state`, but instead would use 'event.kind:event' since a state change fits the more general event definition of something that happened.\n" +
          'State events are often collected on a predictable frequency, such as once every few seconds, once a minute, once an hour, or once a day, but can also be used to describe ad-hoc state queries.',
        name: 'state'
      },
      {
        description: 'This value indicates that an error occurred during the ingestion of this event, and that event data may be missing, inconsistent, or incorrect. `event.kind:pipeline_error` is often associated with parsing errors.',
        name: 'pipeline_error'
      },
      {
        description: 'This value is used by Elastic solutions (e.g., Security, Observability) for alert documents that are created by rules executing within the Kibana alerting framework.\n' +
          'Usage of this value is reserved, and data ingestion pipelines must not populate `event.kind` with the value "signal".',
        name: 'signal'
      }
    ],
    dashed_name: 'event-kind',
    description: 'This is one of four ECS Categorization Fields, and indicates the highest level in the ECS category hierarchy.\n' +
      '`event.kind` gives high-level information about what type of information the event contains, without being specific to the contents of the event. For example, values of this field distinguish alert events from metric events.\n' +
      'The value of this field can be used to inform how these kinds of events should be handled. They may warrant different retention, different access control, it may also help understand whether the data coming in at a regular interval or not.',
    example: 'alert',
    flat_name: 'event.kind',
    ignore_above: 1024,
    level: 'core',
    name: 'kind',
    normalize: [],
    short: 'The kind of the event. The highest categorization field in the hierarchy.',
    type: 'keyword'
  },
  module: {
    dashed_name: 'event-module',
    description: 'Name of the module this data is coming from.\n' +
      'If your monitoring agent supports the concept of modules or plugins to process events of a given source (e.g. Apache logs), `event.module` should contain the name of this module.',
    example: 'apache',
    flat_name: 'event.module',
    ignore_above: 1024,
    level: 'core',
    name: 'module',
    normalize: [],
    short: 'Name of the module this data is coming from.',
    type: 'keyword'
  },
  original: {
    dashed_name: 'event-original',
    description: 'Raw text message of entire event. Used to demonstrate log integrity or where the full log message (before splitting it up in multiple parts) may be required, e.g. for reindex.\n' +
      'This field is not indexed and doc_values are disabled. It cannot be searched, but it can be retrieved from `_source`. If users wish to override this and index this field, please see `Field data types` in the `Elasticsearch Reference`.',
    doc_values: false,
    example: 'Sep 19 08:26:10 host CEF:0&#124;Security&#124; threatmanager&#124;1.0&#124;100&#124; worm successfully stopped&#124;10&#124;src=10.0.0.1 dst=2.1.2.2spt=1232',
    flat_name: 'event.original',
    index: false,
    level: 'core',
    name: 'original',
    normalize: [],
    short: 'Raw text message of entire event.',
    type: 'keyword'
  },
  outcome: {
    allowed_values: [
      {
        description: 'Indicates that this event describes a failed result. A common example is `event.category:file AND event.type:access AND event.outcome:failure` to indicate that a file access was attempted, but was not successful.',
        name: 'failure'
      },
      {
        description: 'Indicates that this event describes a successful result. A common example is `event.category:file AND event.type:create AND event.outcome:success` to indicate that a file was successfully created.',
        name: 'success'
      },
      {
        description: "Indicates that this event describes only an attempt for which the result is unknown from the perspective of the event producer. For example, if the event contains information only about the request side of a transaction that results in a response, populating `event.outcome:unknown` in the request event is appropriate. The unknown value should not be used when an outcome doesn't make logical sense for the event. In such cases `event.outcome` should not be populated.",
        name: 'unknown'
      }
    ],
    dashed_name: 'event-outcome',
    description: 'This is one of four ECS Categorization Fields, and indicates the lowest level in the ECS category hierarchy.\n' +
      '`event.outcome` simply denotes whether the event represents a success or a failure from the perspective of the entity that produced the event.\n' +
      'Note that when a single transaction is described in multiple events, each event may populate different values of `event.outcome`, according to their perspective.\n' +
      'Also note that in the case of a compound event (a single event that contains multiple logical events), this field should be populated with the value that best captures the overall success or failure from the perspective of the event producer.\n' +
      'Further note that not all events will have an associated outcome. For example, this field is generally not populated for metric events, events with `event.type:info`, or any events for which an outcome does not make logical sense.',
    example: 'success',
    flat_name: 'event.outcome',
    ignore_above: 1024,
    level: 'core',
    name: 'outcome',
    normalize: [],
    short: 'The outcome of the event. The lowest level categorization field in the hierarchy.',
    type: 'keyword'
  },
  provider: {
    dashed_name: 'event-provider',
    description: 'Source of the event.\n' +
      'Event transports such as Syslog or the Windows Event Log typically mention the source of an event. It can be the name of the software that generated the event (e.g. Sysmon, httpd), or of a subsystem of the operating system (kernel, Microsoft-Windows-Security-Auditing).',
    example: 'kernel',
    flat_name: 'event.provider',
    ignore_above: 1024,
    level: 'extended',
    name: 'provider',
    normalize: [],
    short: 'Source of the event.',
    type: 'keyword'
  },
  reason: {
    dashed_name: 'event-reason',
    description: 'Reason why this event happened, according to the source.\n' +
      'This describes the why of a particular action or outcome captured in the event. Where `event.action` captures the action from the event, `event.reason` describes why that action was taken. For example, a web proxy with an `event.action` which denied the request may also populate `event.reason` with the reason why (e.g. `blocked site`).',
    example: 'Terminated an unexpected process',
    flat_name: 'event.reason',
    ignore_above: 1024,
    level: 'extended',
    name: 'reason',
    normalize: [],
    short: 'Reason why this event happened, according to the source',
    type: 'keyword'
  },
  reference: {
    dashed_name: 'event-reference',
    description: 'Reference URL linking to additional information about this event.\n' +
      'This URL links to a static definition of this event. Alert events, indicated by `event.kind:alert`, are a common use case for this field.',
    example: 'https://system.example.com/event/#0001234',
    flat_name: 'event.reference',
    ignore_above: 1024,
    level: 'extended',
    name: 'reference',
    normalize: [],
    short: 'Event reference URL',
    type: 'keyword'
  },
  risk_score: {
    dashed_name: 'event-risk-score',
    description: "Risk score or priority of the event (e.g. security solutions). Use your system's original value here.",
    flat_name: 'event.risk_score',
    level: 'core',
    name: 'risk_score',
    normalize: [],
    short: "Risk score or priority of the event (e.g. security solutions). Use your system's original value here.",
    type: 'float'
  },
  risk_score_norm: {
    dashed_name: 'event-risk-score-norm',
    description: 'Normalized risk score or priority of the event, on a scale of 0 to 100.\n' +
      'This is mainly useful if you use more than one system that assigns risk scores, and you want to see a normalized value across all systems.',
    flat_name: 'event.risk_score_norm',
    level: 'extended',
    name: 'risk_score_norm',
    normalize: [],
    short: 'Normalized risk score or priority of the event (0-100).',
    type: 'float'
  },
  sequence: {
    dashed_name: 'event-sequence',
    description: 'Sequence number of the event.\n' +
      'The sequence number is a value published by some event sources, to make the exact ordering of events unambiguous, regardless of the timestamp precision.',
    flat_name: 'event.sequence',
    format: 'string',
    level: 'extended',
    name: 'sequence',
    normalize: [],
    short: 'Sequence number of the event.',
    type: 'long'
  },
  severity: {
    dashed_name: 'event-severity',
    description: 'The numeric severity of the event according to your event source.\n' +
      "What the different severity values mean can be different between sources and use cases. It's up to the implementer to make sure severities are consistent across events from the same source.\n" +
      'The Syslog severity belongs in `log.syslog.severity.code`. `event.severity` is meant to represent the severity according to the event source (e.g. firewall, IDS). If the event source does not publish its own severity, you may optionally copy the `log.syslog.severity.code` to `event.severity`.',
    example: 7,
    flat_name: 'event.severity',
    format: 'string',
    level: 'core',
    name: 'severity',
    normalize: [],
    short: 'Numeric severity of the event.',
    type: 'long'
  },
  start: {
    dashed_name: 'event-start',
    description: 'event.start contains the date when the event started or when the activity was first observed.',
    flat_name: 'event.start',
    level: 'extended',
    name: 'start',
    normalize: [],
    short: 'event.start contains the date when the event started or when the activity was first observed.',
    type: 'date'
  },
  timezone: {
    dashed_name: 'event-timezone',
    description: "This field should be populated when the event's timestamp does not include timezone information already (e.g. default Syslog timestamps). It's optional otherwise.\n" +
      'Acceptable timezone formats are: a canonical ID (e.g. "Europe/Amsterdam"), abbreviated (e.g. "EST") or an HH:mm differential (e.g. "-05:00").',
    flat_name: 'event.timezone',
    ignore_above: 1024,
    level: 'extended',
    name: 'timezone',
    normalize: [],
    short: 'Event time zone.',
    type: 'keyword'
  },
  type: {
    allowed_values: [
      {
        description: 'The access event type is used for the subset of events within a category that indicate that something was accessed. Common examples include `event.category:database AND event.type:access`, or `event.category:file AND event.type:access`. Note for file access, both directory listings and file opens should be included in this subcategory. You can further distinguish access operations using the ECS `event.action` field.',
        name: 'access'
      },
      {
        description: 'The admin event type is used for the subset of events within a category that are related to admin objects. For example, administrative changes within an IAM framework that do not specifically affect a user or group (e.g., adding new applications to a federation solution or connecting discrete forests in Active Directory) would fall into this subcategory. Common example: `event.category:iam AND event.type:change AND event.type:admin`. You can further distinguish admin operations using the ECS `event.action` field.',
        name: 'admin'
      },
      {
        description: 'The allowed event type is used for the subset of events within a category that indicate that something was allowed. Common examples include `event.category:network AND event.type:connection AND event.type:allowed` (to indicate a network firewall event for which the firewall disposition was to allow the connection to complete) and `event.category:intrusion_detection AND event.type:allowed` (to indicate a network intrusion prevention system event for which the IPS disposition was to allow the connection to complete). You can further distinguish allowed operations using the ECS `event.action` field, populating with values of your choosing, such as "allow", "detect", or "pass".',
        name: 'allowed'
      },
      {
        description: 'The change event type is used for the subset of events within a category that indicate that something has changed. If semantics best describe an event as modified, then include them in this subcategory. Common examples include `event.category:process AND event.type:change`, and `event.category:file AND event.type:change`. You can further distinguish change operations using the ECS `event.action` field.',
        name: 'change'
      },
      {
        description: 'Used primarily with `event.category:network` this value is used for the subset of network traffic that includes sufficient information for the event to be included in flow or connection analysis. Events in this subcategory will contain at least source and destination IP addresses, source and destination TCP/UDP ports, and will usually contain counts of bytes and/or packets transferred. Events in this subcategory may contain unidirectional or bidirectional information, including summary information. Use this subcategory to visualize and analyze network connections. Flow analysis, including Netflow, IPFIX, and other flow-related events fit in this subcategory. Note that firewall events from many Next-Generation Firewall (NGFW) devices will also fit into this subcategory.  A common filter for flow/connection information would be `event.category:network AND event.type:connection AND event.type:end` (to view or analyze all completed network connections, ignoring mid-flow reports). You can further distinguish connection events using the ECS `event.action` field, populating with values of your choosing, such as "timeout", or "reset".',
        name: 'connection'
      },
      {
        description: 'The "creation" event type is used for the subset of events within a category that indicate that something was created. A common example is `event.category:file AND event.type:creation`.',
        name: 'creation'
      },
      {
        description: 'The deletion event type is used for the subset of events within a category that indicate that something was deleted. A common example is `event.category:file AND event.type:deletion` to indicate that a file has been deleted.',
        name: 'deletion'
      },
      {
        description: 'The denied event type is used for the subset of events within a category that indicate that something was denied. Common examples include `event.category:network AND event.type:denied` (to indicate a network firewall event for which the firewall disposition was to deny the connection) and `event.category:intrusion_detection AND event.type:denied` (to indicate a network intrusion prevention system event for which the IPS disposition was to deny the connection to complete). You can further distinguish denied operations using the ECS `event.action` field, populating with values of your choosing, such as "blocked", "dropped", or "quarantined".',
        name: 'denied'
      },
      {
        description: 'The end event type is used for the subset of events within a category that indicate something has ended. A common example is `event.category:process AND event.type:end`.',
        name: 'end'
      },
      {
        description: 'The error event type is used for the subset of events within a category that indicate or describe an error. A common example is `event.category:database AND event.type:error`. Note that pipeline errors that occur during the event ingestion process should not use this `event.type` value. Instead, they should use `event.kind:pipeline_error`.',
        name: 'error'
      },
      {
        description: 'The group event type is used for the subset of events within a category that are related to group objects. Common example: `event.category:iam AND event.type:creation AND event.type:group`. You can further distinguish group operations using the ECS `event.action` field.',
        name: 'group'
      },
      {
        description: 'The indicator event type is used for the subset of events within a category that contain details about indicators of compromise (IOCs).\n' +
          'A common example is `event.category:threat AND event.type:indicator`.',
        name: 'indicator'
      },
      {
        description: 'The info event type is used for the subset of events within a category that indicate that they are purely informational, and don\'t report a state change, or any type of action. For example, an initial run of a file integrity monitoring system (FIM), where an agent reports all files under management, would fall into the "info" subcategory. Similarly, an event containing a dump of all currently running processes (as opposed to reporting that a process started/ended) would fall into the "info" subcategory. An additional common examples is `event.category:intrusion_detection AND event.type:info`.',
        name: 'info'
      },
      {
        description: 'The installation event type is used for the subset of events within a category that indicate that something was installed. A common example is `event.category:package` AND `event.type:installation`.',
        name: 'installation'
      },
      {
        description: 'The protocol event type is used for the subset of events within a category that indicate that they contain protocol details or analysis, beyond simply identifying the protocol. Generally, network events that contain specific protocol details will fall into this subcategory. A common example is `event.category:network AND event.type:protocol AND event.type:connection AND event.type:end` (to indicate that the event is a network connection event sent at the end of a connection that also includes a protocol detail breakdown). Note that events that only indicate the name or id of the protocol should not use the protocol value. Further note that when the protocol subcategory is used, the identified protocol is populated in the ECS `network.protocol` field.',
        name: 'protocol'
      },
      {
        description: 'The start event type is used for the subset of events within a category that indicate something has started. A common example is `event.category:process AND event.type:start`.',
        name: 'start'
      },
      {
        description: 'The user event type is used for the subset of events within a category that are related to user objects. Common example: `event.category:iam AND event.type:deletion AND event.type:user`. You can further distinguish user operations using the ECS `event.action` field.',
        name: 'user'
      }
    ],
    dashed_name: 'event-type',
    description: 'This is one of four ECS Categorization Fields, and indicates the third level in the ECS category hierarchy.\n' +
      '`event.type` represents a categorization "sub-bucket" that, when used along with the `event.category` field values, enables filtering events down to a level appropriate for single visualization.\n' +
      'This field is an array. This will allow proper categorization of some events that fall in multiple event types.',
    flat_name: 'event.type',
    ignore_above: 1024,
    level: 'core',
    name: 'type',
    normalize: [ 'array' ],
    short: 'Event type. The third categorization field in the hierarchy.',
    type: 'keyword'
  },
  url: {
    dashed_name: 'event-url',
    description: 'URL linking to an external system to continue investigation of this event.\n' +
      'This URL links to another system where in-depth investigation of the specific occurrence of this event can take place. Alert events, indicated by `event.kind:alert`, are a common use case for this field.',
    example: 'https://mysystem.example.com/alert/5271dedb-f5b0-4218-87f0-4ac4870a38fe',
    flat_name: 'event.url',
    ignore_above: 1024,
    level: 'extended',
    name: 'url',
    normalize: [],
    short: 'Event investigation URL',
    type: 'keyword'
  }
}