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
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object]
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
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object]
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
    allowed_values: [ [Object], [Object], [Object] ],
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
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object], [Object],
      [Object]
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