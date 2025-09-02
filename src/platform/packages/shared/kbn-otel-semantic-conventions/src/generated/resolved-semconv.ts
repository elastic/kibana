/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * OpenTelemetry semantic conventions field definitions.
 *
 * This file is auto-generated. Do not edit manually.
 * Sources: resolved-semconv.yaml + hardcoded OTLP mappings
 * Registry groups: 132
 * Metric groups: 402
 * Hardcoded fields: 34
 * Total fields: 1101
 *
 * @internal
 *
 * WARNING: This object contains 1101+ field definitions (~50KB+ minified).
 * Direct import will significantly increase client bundle size.
 *
 * RECOMMENDED USAGE:
 * - Server-side: Import directly for field metadata services
 * - Client-side: Use fields_metadata API endpoints instead of direct import
 * - Build tools: Ensure this is not included in client-side bundles
 *
 * The fields_metadata package provides optimized APIs to prevent
 * bundle size explosions. Use those APIs instead of importing this directly.
 */
export const semconvFlat = {
  '@timestamp': {
    name: '@timestamp',
    description: 'Time when the event occurred. UNIX Epoch time in nanoseconds.',
    type: 'date_nanos',
  },
  observed_timestamp: {
    name: 'observed_timestamp',
    description: 'Time when the event was observed by the collection system.',
    type: 'date_nanos',
  },
  severity_number: {
    name: 'severity_number',
    description: 'Numerical value of the severity.',
    type: 'long',
  },
  severity_text: {
    name: 'severity_text',
    description: 'The severity text (also known as log level).',
    type: 'keyword',
  },
  'body.text': {
    name: 'body.text',
    description: 'A value containing the body of the log record (text format).',
    type: 'match_only_text',
  },
  'body.structured': {
    name: 'body.structured',
    description: 'A value containing the body of the log record (structured format).',
    type: 'flattened',
  },
  dropped_attributes_count: {
    name: 'dropped_attributes_count',
    description: 'Number of attributes that were discarded due to limits.',
    type: 'long',
  },
  trace_id: {
    name: 'trace_id',
    description: 'A unique identifier for a trace.',
    type: 'keyword',
  },
  span_id: {
    name: 'span_id',
    description: 'A unique identifier for a span within a trace.',
    type: 'keyword',
  },
  event_name: {
    name: 'event_name',
    description: 'A unique identifier of event category/type.',
    type: 'keyword',
  },
  'scope.name': {
    name: 'scope.name',
    description: 'The name of the instrumentation scope that produced the span.',
    type: 'keyword',
  },
  'scope.version': {
    name: 'scope.version',
    description: 'The version of the instrumentation scope.',
    type: 'keyword',
  },
  'scope.dropped_attributes_count': {
    name: 'scope.dropped_attributes_count',
    description: 'Number of scope attributes that were discarded due to limits.',
    type: 'long',
  },
  'scope.schema_url': {
    name: 'scope.schema_url',
    description: 'The Schema URL for the scope.',
    type: 'keyword',
  },
  'resource.dropped_attributes_count': {
    name: 'resource.dropped_attributes_count',
    description: 'Number of resource attributes that were discarded due to limits.',
    type: 'long',
  },
  'resource.schema_url': {
    name: 'resource.schema_url',
    description: 'The Schema URL for the resource.',
    type: 'keyword',
  },
  start_timestamp: {
    name: 'start_timestamp',
    description: 'StartTimeUnixNano is the time when the cumulative metric was reset.',
    type: 'date_nanos',
  },
  unit: {
    name: 'unit',
    description: 'Unit in which the metric value is reported.',
    type: 'keyword',
  },
  trace_state: {
    name: 'trace_state',
    description:
      'Tracestate represents tracing-system specific context in a list of key value pairs.',
    type: 'keyword',
  },
  parent_span_id: {
    name: 'parent_span_id',
    description: "The span_id of this span's parent span.",
    type: 'keyword',
  },
  name: {
    name: 'name',
    description: "A description of the span's operation.",
    type: 'keyword',
  },
  kind: {
    name: 'kind',
    description: 'Distinguishes between spans generated in a particular context.',
    type: 'keyword',
  },
  duration: {
    name: 'duration',
    description: 'Duration of the span in nanoseconds (end_time - start_time).',
    type: 'long',
  },
  dropped_events_count: {
    name: 'dropped_events_count',
    description: 'Number of events that were discarded due to limits.',
    type: 'long',
  },
  links: {
    name: 'links',
    description: 'Links to other spans.',
    type: 'object',
  },
  'links.trace_id': {
    name: 'links.trace_id',
    description: "A unique identifier of the linked span's trace.",
    type: 'keyword',
  },
  'links.span_id': {
    name: 'links.span_id',
    description: 'A unique identifier for the linked span.',
    type: 'keyword',
  },
  'links.trace_state': {
    name: 'links.trace_state',
    description: 'Tracestate of the linked span.',
    type: 'keyword',
  },
  'links.attributes': {
    name: 'links.attributes',
    description: 'Additional link attributes.',
    type: 'object',
  },
  'links.dropped_attributes_count': {
    name: 'links.dropped_attributes_count',
    description: 'Number of link attributes that were discarded due to limits.',
    type: 'long',
  },
  dropped_links_count: {
    name: 'dropped_links_count',
    description: 'Number of links that were discarded due to limits.',
    type: 'long',
  },
  status: {
    name: 'status',
    description: 'An optional final status for the span.',
    type: 'object',
  },
  'status.message': {
    name: 'status.message',
    description: 'A developer-facing human readable error message.',
    type: 'keyword',
  },
  'status.code': {
    name: 'status.code',
    description: 'The status code.',
    type: 'keyword',
  },
  'geo.locality.name': {
    name: 'geo.locality.name',
    description:
      'Locality name. Represents the name of a city, town, village, or similar populated place.',
    type: 'keyword',
    example: 'Montreal',
  },
  'geo.continent.code': {
    name: 'geo.continent.code',
    description: 'Two-letter code representing continent’s name.',
    type: 'keyword',
  },
  'geo.country.iso_code': {
    name: 'geo.country.iso_code',
    description:
      'Two-letter ISO Country Code ([ISO 3166-1 alpha2](https://wikipedia.org/wiki/ISO_3166-1#Codes)).',
    type: 'keyword',
    example: 'CA',
  },
  'geo.location.lon': {
    name: 'geo.location.lon',
    description:
      'Longitude of the geo location in [WGS84](https://wikipedia.org/wiki/World_Geodetic_System#WGS84).',
    type: 'double',
    example: '-73.61483',
  },
  'geo.location.lat': {
    name: 'geo.location.lat',
    description:
      'Latitude of the geo location in [WGS84](https://wikipedia.org/wiki/World_Geodetic_System#WGS84).',
    type: 'double',
    example: '45.505918',
  },
  'geo.postal_code': {
    name: 'geo.postal_code',
    description:
      'Postal code associated with the location. Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
    type: 'keyword',
    example: '94040',
  },
  'geo.region.iso_code': {
    name: 'geo.region.iso_code',
    description: 'Region ISO code ([ISO 3166-2](https://wikipedia.org/wiki/ISO_3166-2)).',
    type: 'keyword',
    example: 'CA-QC',
  },
  'system.device': {
    name: 'system.device',
    description: 'The device identifier',
    type: 'keyword',
    example: '(identifier)',
  },
  'system.memory.state': {
    name: 'system.memory.state',
    description: 'The memory state',
    type: 'keyword',
    example: 'free',
  },
  'system.paging.state': {
    name: 'system.paging.state',
    description: 'The memory paging state',
    type: 'keyword',
    example: 'free',
  },
  'system.paging.type': {
    name: 'system.paging.type',
    description: 'The memory paging type',
    type: 'keyword',
    example: 'minor',
  },
  'system.paging.direction': {
    name: 'system.paging.direction',
    description: 'The paging access direction',
    type: 'keyword',
    example: 'in',
  },
  'system.filesystem.state': {
    name: 'system.filesystem.state',
    description: 'The filesystem state',
    type: 'keyword',
    example: 'used',
  },
  'system.filesystem.type': {
    name: 'system.filesystem.type',
    description: 'The filesystem type',
    type: 'keyword',
    example: 'ext4',
  },
  'system.filesystem.mode': {
    name: 'system.filesystem.mode',
    description: 'The filesystem mode',
    type: 'keyword',
    example: 'rw, ro',
  },
  'system.filesystem.mountpoint': {
    name: 'system.filesystem.mountpoint',
    description: 'The filesystem mount path',
    type: 'keyword',
    example: '/mnt/data',
  },
  'system.process.status': {
    name: 'system.process.status',
    description:
      'The process state, e.g., [Linux Process State Codes](https://man7.org/linux/man-pages/man1/ps.1.html#PROCESS_STATE_CODES)',
    type: 'keyword',
    example: 'running',
  },
  'system.cpu.logical_number': {
    name: 'system.cpu.logical_number',
    description: 'Deprecated, use `cpu.logical_number` instead.',
    type: 'long',
    example: '1',
  },
  'client.address': {
    name: 'client.address',
    description:
      'Client address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
    type: 'keyword',
    example: 'client.example.com',
  },
  'client.port': {
    name: 'client.port',
    description: 'Client port number.',
    type: 'long',
    example: '65123',
  },
  'cloudfoundry.system.id': {
    name: 'cloudfoundry.system.id',
    description: 'A guid or another name describing the event source.',
    type: 'keyword',
    example: 'cf/gorouter',
  },
  'cloudfoundry.system.instance.id': {
    name: 'cloudfoundry.system.instance.id',
    description: 'A guid describing the concrete instance of the event source.',
    type: 'keyword',
    example: '218fc5a9-a5f1-4b54-aa05-46717d0ab26d',
  },
  'cloudfoundry.app.name': {
    name: 'cloudfoundry.app.name',
    description: 'The name of the application.',
    type: 'keyword',
    example: 'my-app-name',
  },
  'cloudfoundry.app.id': {
    name: 'cloudfoundry.app.id',
    description: 'The guid of the application.',
    type: 'keyword',
    example: '218fc5a9-a5f1-4b54-aa05-46717d0ab26d',
  },
  'cloudfoundry.app.instance.id': {
    name: 'cloudfoundry.app.instance.id',
    description: 'The index of the application instance. 0 when just one instance is active.',
    type: 'keyword',
    example: '0',
  },
  'cloudfoundry.space.name': {
    name: 'cloudfoundry.space.name',
    description: 'The name of the CloudFoundry space the application is running in.',
    type: 'keyword',
    example: 'my-space-name',
  },
  'cloudfoundry.space.id': {
    name: 'cloudfoundry.space.id',
    description: 'The guid of the CloudFoundry space the application is running in.',
    type: 'keyword',
    example: '218fc5a9-a5f1-4b54-aa05-46717d0ab26d',
  },
  'cloudfoundry.org.name': {
    name: 'cloudfoundry.org.name',
    description: 'The name of the CloudFoundry organization the app is running in.',
    type: 'keyword',
    example: 'my-org-name',
  },
  'cloudfoundry.org.id': {
    name: 'cloudfoundry.org.id',
    description: 'The guid of the CloudFoundry org the application is running in.',
    type: 'keyword',
    example: '218fc5a9-a5f1-4b54-aa05-46717d0ab26d',
  },
  'cloudfoundry.process.id': {
    name: 'cloudfoundry.process.id',
    description: 'The UID identifying the process.',
    type: 'keyword',
    example: '218fc5a9-a5f1-4b54-aa05-46717d0ab26d',
  },
  'cloudfoundry.process.type': {
    name: 'cloudfoundry.process.type',
    description: 'The type of process.',
    type: 'keyword',
    example: 'web',
  },
  'webengine.name': {
    name: 'webengine.name',
    description: 'The name of the web engine.',
    type: 'keyword',
    example: 'WildFly',
  },
  'webengine.version': {
    name: 'webengine.version',
    description: 'The version of the web engine.',
    type: 'keyword',
    example: '21.0.0',
  },
  'webengine.description': {
    name: 'webengine.description',
    description:
      'Additional description of the web engine (e.g. detailed version and edition information).',
    type: 'keyword',
    example: 'WildFly Full 21.0.0.Final (WildFly Core 13.0.1.Final) - 2.2.2.Final',
  },
  'signalr.connection.status': {
    name: 'signalr.connection.status',
    description: 'SignalR HTTP connection closure status.',
    type: 'keyword',
    example: 'app_shutdown',
  },
  'signalr.transport': {
    name: 'signalr.transport',
    description:
      '[SignalR transport type](https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/TransportProtocols.md)',
    type: 'keyword',
    example: 'web_sockets',
  },
  'db.collection.name': {
    name: 'db.collection.name',
    description: 'The name of a collection (table, container) within the database.',
    type: 'keyword',
    example: 'public.users',
  },
  'db.namespace': {
    name: 'db.namespace',
    description: 'The name of the database, fully qualified within the server address and port.',
    type: 'keyword',
    example: 'customers',
  },
  'db.operation.name': {
    name: 'db.operation.name',
    description: 'The name of the operation or command being executed.',
    type: 'keyword',
    example: 'findAndModify',
  },
  'db.query.text': {
    name: 'db.query.text',
    description: 'The database query being executed.',
    type: 'keyword',
    example: 'SELECT * FROM wuser_table where username = ?',
  },
  'db.query.parameter': {
    name: 'db.query.parameter',
    description:
      'A database query parameter, with `<key>` being the parameter name, and the attribute value being a string representation of the parameter value.',
    type: 'keyword',
    example: 'someval',
  },
  'db.query.summary': {
    name: 'db.query.summary',
    description: 'Low cardinality summary of a database query.',
    type: 'keyword',
    example: 'SELECT wuser_table',
  },
  'db.stored_procedure.name': {
    name: 'db.stored_procedure.name',
    description: 'The name of a stored procedure within the database.',
    type: 'keyword',
    example: 'GetCustomer',
  },
  'db.operation.parameter': {
    name: 'db.operation.parameter',
    description:
      'A database operation parameter, with `<key>` being the parameter name, and the attribute value being a string representation of the parameter value.',
    type: 'keyword',
    example: 'someval',
  },
  'db.operation.batch.size': {
    name: 'db.operation.batch.size',
    description: 'The number of queries included in a batch operation.',
    type: 'long',
    example: '2',
  },
  'db.response.status_code': {
    name: 'db.response.status_code',
    description: 'Database response status code.',
    type: 'keyword',
    example: '102',
  },
  'db.response.returned_rows': {
    name: 'db.response.returned_rows',
    description: 'Number of rows returned by the operation.',
    type: 'long',
    example: '10',
  },
  'db.system.name': {
    name: 'db.system.name',
    description:
      'The database management system (DBMS) product as identified by the client instrumentation.',
    type: 'keyword',
  },
  'db.client.connection.state': {
    name: 'db.client.connection.state',
    description: 'The state of a connection in the pool',
    type: 'keyword',
    example: 'idle',
  },
  'db.client.connection.pool.name': {
    name: 'db.client.connection.pool.name',
    description:
      "The name of the connection pool; unique within the instrumented application. In case the connection pool implementation doesn't provide a name, instrumentation SHOULD use a combination of parameters that would make the name unique, for example, combining attributes `server.address`, `server.port`, and `db.namespace`, formatted as `server.address:server.port/db.namespace`. Instrumentations that generate connection pool name following different patterns SHOULD document it.",
    type: 'keyword',
    example: 'myDataSource',
  },
  'openai.request.service_tier': {
    name: 'openai.request.service_tier',
    description: 'The service tier requested. May be a specific tier, default, or auto.',
    type: 'keyword',
    example: 'auto',
  },
  'openai.response.service_tier': {
    name: 'openai.response.service_tier',
    description: 'The service tier used for the response.',
    type: 'keyword',
    example: 'scale',
  },
  'openai.response.system_fingerprint': {
    name: 'openai.response.system_fingerprint',
    description: 'A fingerprint to track any eventual change in the Generative AI environment.',
    type: 'keyword',
    example: 'fp_44709d6fcb',
  },
  'code.function.name': {
    name: 'code.function.name',
    description:
      "The method or function fully-qualified name without arguments. The value should fit the natural representation of the language runtime, which is also likely the same used within `code.stacktrace` attribute value. This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Function'. This constraint is imposed to prevent redundancy and maintain data integrity.",
    type: 'keyword',
    example: 'com.example.MyHttpService.serveRequest',
  },
  'code.file.path': {
    name: 'code.file.path',
    description:
      "The source code file name that identifies the code unit as uniquely as possible (preferably an absolute file path). This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Function'. This constraint is imposed to prevent redundancy and maintain data integrity.",
    type: 'keyword',
    example: '/',
  },
  'code.line.number': {
    name: 'code.line.number',
    description:
      "The line number in `code.file.path` best representing the operation. It SHOULD point within the code unit named in `code.function.name`. This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Line'. This constraint is imposed to prevent redundancy and maintain data integrity.",
    type: 'long',
  },
  'code.column.number': {
    name: 'code.column.number',
    description:
      "The column number in `code.file.path` best representing the operation. It SHOULD point within the code unit named in `code.function.name`. This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Line'. This constraint is imposed to prevent redundancy and maintain data integrity.",
    type: 'long',
  },
  'code.stacktrace': {
    name: 'code.stacktrace',
    description:
      "A stacktrace as a string in the natural representation for the language runtime. The representation is identical to [`exception.stacktrace`](/docs/exceptions/exceptions-spans.md#stacktrace-representation). This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Location'. This constraint is imposed to prevent redundancy and maintain data integrity.",
    type: 'keyword',
    example: 'a',
  },
  'jvm.gc.action': {
    name: 'jvm.gc.action',
    description: 'Name of the garbage collector action.',
    type: 'keyword',
    example: 'end of minor GC',
  },
  'jvm.gc.cause': {
    name: 'jvm.gc.cause',
    description: 'Name of the garbage collector cause.',
    type: 'keyword',
    example: 'System.gc()',
  },
  'jvm.gc.name': {
    name: 'jvm.gc.name',
    description: 'Name of the garbage collector.',
    type: 'keyword',
    example: 'G1 Young Generation',
  },
  'jvm.memory.type': {
    name: 'jvm.memory.type',
    description: 'The type of memory.',
    type: 'keyword',
    example: 'heap',
  },
  'jvm.memory.pool.name': {
    name: 'jvm.memory.pool.name',
    description: 'Name of the memory pool.',
    type: 'keyword',
    example: 'G1 Old Gen',
  },
  'jvm.thread.daemon': {
    name: 'jvm.thread.daemon',
    description: 'Whether the thread is daemon or not.',
    type: 'boolean',
  },
  'jvm.thread.state': {
    name: 'jvm.thread.state',
    description: 'State of the thread.',
    type: 'keyword',
    example: 'runnable',
  },
  'jvm.buffer.pool.name': {
    name: 'jvm.buffer.pool.name',
    description: 'Name of the buffer pool.',
    type: 'keyword',
    example: 'mapped',
  },
  'server.address': {
    name: 'server.address',
    description:
      'Server domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
    type: 'keyword',
    example: 'example.com',
  },
  'server.port': {
    name: 'server.port',
    description: 'Server port number.',
    type: 'long',
    example: '80',
  },
  'host.id': {
    name: 'host.id',
    description:
      'Unique host ID. For Cloud, this must be the instance_id assigned by the cloud provider. For non-containerized systems, this should be the `machine-id`. See the table below for the sources to use to determine the `machine-id` based on operating system.',
    type: 'keyword',
    example: 'fdbf79e8af94cb7f9e8df36789187052',
  },
  'host.name': {
    name: 'host.name',
    description:
      'Name of the host. On Unix systems, it may contain what the hostname command returns, or the fully qualified hostname, or another name specified by the user.',
    type: 'keyword',
    example: 'opentelemetry-test',
  },
  'host.type': {
    name: 'host.type',
    description: 'Type of host. For Cloud, this must be the machine type.',
    type: 'keyword',
    example: 'n1-standard-1',
  },
  'host.arch': {
    name: 'host.arch',
    description: 'The CPU architecture the host system is running on.',
    type: 'keyword',
  },
  'host.image.name': {
    name: 'host.image.name',
    description: 'Name of the VM image or OS install the host was instantiated from.',
    type: 'keyword',
    example: 'infra-ami-eks-worker-node-7d4ec78312',
  },
  'host.image.id': {
    name: 'host.image.id',
    description: 'VM image ID or host OS image ID. For Cloud, this value is from the provider.',
    type: 'keyword',
    example: 'ami-07b06b442921831e5',
  },
  'host.image.version': {
    name: 'host.image.version',
    description:
      'The version string of the VM image or host OS as defined in [Version Attributes](/docs/resource/README.md#version-attributes).',
    type: 'keyword',
    example: '0.1',
  },
  'host.ip': {
    name: 'host.ip',
    description: 'Available IP addresses of the host, excluding loopback interfaces.',
    type: 'keyword',
    example: '192.168.1.140,fe80::abc2:4a28:737a:609e',
  },
  'host.mac': {
    name: 'host.mac',
    description: 'Available MAC addresses of the host, excluding loopback interfaces.',
    type: 'keyword',
    example: 'AC-DE-48-23-45-67,AC-DE-48-23-45-67-01-9F',
  },
  'host.cpu.vendor.id': {
    name: 'host.cpu.vendor.id',
    description: 'Processor manufacturer identifier. A maximum 12-character string.',
    type: 'keyword',
    example: 'GenuineIntel',
  },
  'host.cpu.family': {
    name: 'host.cpu.family',
    description: 'Family or generation of the CPU.',
    type: 'keyword',
    example: '6',
  },
  'host.cpu.model.id': {
    name: 'host.cpu.model.id',
    description:
      'Model identifier. It provides more granular information about the CPU, distinguishing it from other CPUs within the same family.',
    type: 'keyword',
    example: '6',
  },
  'host.cpu.model.name': {
    name: 'host.cpu.model.name',
    description: 'Model designation of the processor.',
    type: 'keyword',
    example: '11th Gen Intel(R) Core(TM) i7-1185G7 @ 3.00GHz',
  },
  'host.cpu.stepping': {
    name: 'host.cpu.stepping',
    description: 'Stepping or core revisions.',
    type: 'keyword',
    example: '1',
  },
  'host.cpu.cache.l2.size': {
    name: 'host.cpu.cache.l2.size',
    description: 'The amount of level 2 memory cache available to the processor (in Bytes).',
    type: 'long',
    example: '12288000',
  },
  'peer.service': {
    name: 'peer.service',
    description:
      'The [`service.name`](/docs/resource/README.md#service) of the remote service. SHOULD be equal to the actual `service.name` resource attribute of the remote service if any.',
    type: 'keyword',
    example: 'A',
  },
  'browser.brands': {
    name: 'browser.brands',
    description: 'Array of brand name and version separated by a space',
    type: 'keyword',
    example: 'Not A;Brand 99,Chromium 99,Chrome 99',
  },
  'browser.platform': {
    name: 'browser.platform',
    description: 'The platform on which the browser is running',
    type: 'keyword',
    example: 'Windows',
  },
  'browser.mobile': {
    name: 'browser.mobile',
    description: 'A boolean that is true if the browser is running on a mobile device',
    type: 'boolean',
  },
  'browser.language': {
    name: 'browser.language',
    description: 'Preferred language of the user using the browser',
    type: 'keyword',
    example: 'en',
  },
  'aspnetcore.rate_limiting.policy': {
    name: 'aspnetcore.rate_limiting.policy',
    description: 'Rate limiting policy name.',
    type: 'keyword',
    example: 'fixed',
  },
  'aspnetcore.rate_limiting.result': {
    name: 'aspnetcore.rate_limiting.result',
    description:
      'Rate-limiting result, shows whether the lease was acquired or contains a rejection reason',
    type: 'keyword',
    example: 'acquired',
  },
  'aspnetcore.routing.is_fallback': {
    name: 'aspnetcore.routing.is_fallback',
    description: 'A value that indicates whether the matched route is a fallback route.',
    type: 'boolean',
    example: 'true',
  },
  'aspnetcore.diagnostics.handler.type': {
    name: 'aspnetcore.diagnostics.handler.type',
    description:
      'Full type name of the [`IExceptionHandler`](https://learn.microsoft.com/dotnet/api/microsoft.aspnetcore.diagnostics.iexceptionhandler) implementation that handled the exception.',
    type: 'keyword',
    example: 'Contoso.MyHandler',
  },
  'aspnetcore.request.is_unhandled': {
    name: 'aspnetcore.request.is_unhandled',
    description: 'Flag indicating if request was handled by the application pipeline.',
    type: 'boolean',
    example: 'true',
  },
  'aspnetcore.routing.match_status': {
    name: 'aspnetcore.routing.match_status',
    description: 'Match result - success or failure',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.diagnostics.exception.result': {
    name: 'aspnetcore.diagnostics.exception.result',
    description: 'ASP.NET Core exception middleware handling result.',
    type: 'keyword',
    example: 'handled',
  },
  'aspnetcore.memory_pool.owner': {
    name: 'aspnetcore.memory_pool.owner',
    description: 'The name of the library or subsystem using the memory pool instance.',
    type: 'keyword',
    example: 'kestrel',
  },
  'aspnetcore.identity.user_type': {
    name: 'aspnetcore.identity.user_type',
    description: 'The full name of the identity user type.',
    type: 'keyword',
    example: 'Contoso.ContosoUser',
  },
  'aspnetcore.authentication.result': {
    name: 'aspnetcore.authentication.result',
    description: 'The result of the authentication operation.',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.authentication.scheme': {
    name: 'aspnetcore.authentication.scheme',
    description: 'The identifier that names a particular authentication handler.',
    type: 'keyword',
    example: 'Cookies',
  },
  'aspnetcore.user.is_authenticated': {
    name: 'aspnetcore.user.is_authenticated',
    description: 'A value that indicates whether the user is authenticated.',
    type: 'boolean',
    example: 'true',
  },
  'aspnetcore.authorization.policy': {
    name: 'aspnetcore.authorization.policy',
    description: 'The name of the authorization policy.',
    type: 'keyword',
    example: 'RequireAdminRole',
  },
  'aspnetcore.authorization.result': {
    name: 'aspnetcore.authorization.result',
    description: 'The result of calling the authorization service.',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.identity.result': {
    name: 'aspnetcore.identity.result',
    description: 'The result of the identity operation.',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.identity.error_code': {
    name: 'aspnetcore.identity.error_code',
    description: 'The error code for a failed identity operation.',
    type: 'keyword',
    example: 'DefaultError',
  },
  'aspnetcore.identity.user.update_type': {
    name: 'aspnetcore.identity.user.update_type',
    description: 'The user update type.',
    type: 'keyword',
    example: 'update',
  },
  'aspnetcore.identity.password_check_result': {
    name: 'aspnetcore.identity.password_check_result',
    description: 'The result from checking the password.',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.identity.token_purpose': {
    name: 'aspnetcore.identity.token_purpose',
    description: 'What the token will be used for.',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.identity.token_verified': {
    name: 'aspnetcore.identity.token_verified',
    description: 'The result of token verification.',
    type: 'keyword',
    example: 'success',
  },
  'aspnetcore.identity.sign_in.type': {
    name: 'aspnetcore.identity.sign_in.type',
    description: 'The authentication type.',
    type: 'keyword',
    example: 'password',
  },
  'aspnetcore.sign_in.is_persistent': {
    name: 'aspnetcore.sign_in.is_persistent',
    description: 'A flag indicating whether the sign in is persistent.',
    type: 'boolean',
  },
  'aspnetcore.identity.sign_in.result': {
    name: 'aspnetcore.identity.sign_in.result',
    description: 'Whether the sign in result was success or failure.',
    type: 'keyword',
    example: 'password',
  },
  'rpc.connect_rpc.error_code': {
    name: 'rpc.connect_rpc.error_code',
    description:
      'The [error codes](https://connectrpc.com//docs/protocol/#error-codes) of the Connect request. Error codes are always string values.',
    type: 'keyword',
  },
  'rpc.connect_rpc.request.metadata': {
    name: 'rpc.connect_rpc.request.metadata',
    description:
      'Connect request metadata, `<key>` being the normalized Connect Metadata key (lowercase), the value being the metadata values.',
    type: 'keyword',
    example: '1.2.3.4,1.2.3.5',
  },
  'rpc.connect_rpc.response.metadata': {
    name: 'rpc.connect_rpc.response.metadata',
    description:
      'Connect response metadata, `<key>` being the normalized Connect Metadata key (lowercase), the value being the metadata values.',
    type: 'keyword',
    example: 'attribute_value',
  },
  'rpc.grpc.status_code': {
    name: 'rpc.grpc.status_code',
    description:
      'The gRPC status code of the last gRPC requests performed in scope of this export call.',
    type: 'keyword',
  },
  'rpc.grpc.request.metadata': {
    name: 'rpc.grpc.request.metadata',
    description:
      'gRPC request metadata, `<key>` being the normalized gRPC Metadata key (lowercase), the value being the metadata values.',
    type: 'keyword',
    example: '1.2.3.4,1.2.3.5',
  },
  'rpc.grpc.response.metadata': {
    name: 'rpc.grpc.response.metadata',
    description:
      'gRPC response metadata, `<key>` being the normalized gRPC Metadata key (lowercase), the value being the metadata values.',
    type: 'keyword',
    example: 'attribute_value',
  },
  'rpc.jsonrpc.error_code': {
    name: 'rpc.jsonrpc.error_code',
    description: '`error.code` property of response if it is an error response.',
    type: 'long',
    example: '-32700',
  },
  'rpc.jsonrpc.error_message': {
    name: 'rpc.jsonrpc.error_message',
    description: '`error.message` property of response if it is an error response.',
    type: 'keyword',
    example: 'Parse error',
  },
  'rpc.jsonrpc.request_id': {
    name: 'rpc.jsonrpc.request_id',
    description:
      '`id` property of request or response. Since protocol allows id to be int, string, `null` or missing (for notifications), value is expected to be cast to string for simplicity. Use empty string in case of `null` value. Omit entirely if this is a notification.',
    type: 'keyword',
    example: '10',
  },
  'rpc.jsonrpc.version': {
    name: 'rpc.jsonrpc.version',
    description:
      "Protocol version as in `jsonrpc` property of request/response. Since JSON-RPC 1.0 doesn't specify this, the value can be omitted.",
    type: 'keyword',
    example: '2',
  },
  'rpc.method': {
    name: 'rpc.method',
    description:
      'The name of the (logical) method being called, must be equal to the $method part in the span name.',
    type: 'keyword',
    example: 'e',
  },
  'rpc.service': {
    name: 'rpc.service',
    description:
      'The full (logical) name of the service being called, including its package name, if applicable.',
    type: 'keyword',
    example: 'm',
  },
  'rpc.system': {
    name: 'rpc.system',
    description:
      'A string identifying the remoting system. See below for a list of well-known identifiers.',
    type: 'keyword',
  },
  'rpc.message.type': {
    name: 'rpc.message.type',
    description: 'Whether this is a received or sent message.',
    type: 'keyword',
  },
  'rpc.message.id': {
    name: 'rpc.message.id',
    description:
      'MUST be calculated as two different counters starting from `1` one for sent messages and one for received message.',
    type: 'long',
  },
  'rpc.message.compressed_size': {
    name: 'rpc.message.compressed_size',
    description: 'Compressed size of the message in bytes.',
    type: 'long',
  },
  'rpc.message.uncompressed_size': {
    name: 'rpc.message.uncompressed_size',
    description: 'Uncompressed size of the message in bytes.',
    type: 'long',
  },
  'enduser.id': {
    name: 'enduser.id',
    description:
      'Unique identifier of an end user in the system. It maybe a username, email address, or other identifier.',
    type: 'keyword',
    example: 'username',
  },
  'enduser.pseudo.id': {
    name: 'enduser.pseudo.id',
    description:
      "Pseudonymous identifier of an end user. This identifier should be a random value that is not directly linked or associated with the end user's actual identity.",
    type: 'keyword',
    example: 'QdH5CAWJgqVT4rOr0qtumf',
  },
  'profile.frame.type': {
    name: 'profile.frame.type',
    description: 'Describes the interpreter or compiler of a single frame.',
    type: 'keyword',
    example: 'cpython',
  },
  'cassandra.coordinator.dc': {
    name: 'cassandra.coordinator.dc',
    description: 'The data center of the coordinating node for a query.',
    type: 'keyword',
    example: 'u',
  },
  'cassandra.coordinator.id': {
    name: 'cassandra.coordinator.id',
    description: 'The ID of the coordinating node for a query.',
    type: 'keyword',
    example: 'b',
  },
  'cassandra.consistency.level': {
    name: 'cassandra.consistency.level',
    description:
      'The consistency level of the query. Based on consistency values from [CQL](https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/dml/dmlConfigConsistency.html).',
    type: 'keyword',
  },
  'cassandra.query.idempotent': {
    name: 'cassandra.query.idempotent',
    description: 'Whether or not the query is idempotent.',
    type: 'boolean',
  },
  'cassandra.page.size': {
    name: 'cassandra.page.size',
    description: 'The fetch size used for paging, i.e. how many rows will be returned at once.',
    type: 'long',
    example: '5000',
  },
  'cassandra.speculative_execution.count': {
    name: 'cassandra.speculative_execution.count',
    description:
      'The number of times a query was speculatively executed. Not set or `0` if the query was not executed speculatively.',
    type: 'long',
    example: '0',
  },
  'linux.memory.slab.state': {
    name: 'linux.memory.slab.state',
    description: 'The Linux Slab memory state',
    type: 'keyword',
    example: 'reclaimable',
  },
  'user_agent.original': {
    name: 'user_agent.original',
    description:
      'Value of the [HTTP User-Agent](https://www.rfc-editor.org/rfc/rfc9110.html#field.user-agent) header sent by the client.',
    type: 'keyword',
    example: 'CERN-LineMode/2.15 libwww/2.17b3',
  },
  'user_agent.name': {
    name: 'user_agent.name',
    description:
      "Name of the user-agent extracted from original. Usually refers to the browser's name.",
    type: 'keyword',
    example: 'Safari',
  },
  'user_agent.version': {
    name: 'user_agent.version',
    description:
      "Version of the user-agent extracted from original. Usually refers to the browser's version",
    type: 'keyword',
    example: '14.1.2',
  },
  'user_agent.os.name': {
    name: 'user_agent.os.name',
    description: 'Human readable operating system name.',
    type: 'keyword',
    example: 'iOS',
  },
  'user_agent.os.version': {
    name: 'user_agent.os.version',
    description:
      'The version string of the operating system as defined in [Version Attributes](/docs/resource/README.md#version-attributes).',
    type: 'keyword',
    example: '14.2.1',
  },
  'user_agent.synthetic.type': {
    name: 'user_agent.synthetic.type',
    description: 'Specifies the category of synthetic traffic, such as tests or bots.',
    type: 'keyword',
  },
  'os.type': {
    name: 'os.type',
    description: 'The operating system type.',
    type: 'keyword',
  },
  'os.description': {
    name: 'os.description',
    description:
      'Human readable (not intended to be parsed) OS version information, like e.g. reported by `ver` or `lsb_release -a` commands.',
    type: 'keyword',
    example: 'Microsoft Windows [Version 10.0.18363.778]',
  },
  'os.name': {
    name: 'os.name',
    description: 'Human readable operating system name.',
    type: 'keyword',
    example: 'iOS',
  },
  'os.version': {
    name: 'os.version',
    description:
      'The version string of the operating system as defined in [Version Attributes](/docs/resource/README.md#version-attributes).',
    type: 'keyword',
    example: '14.2.1',
  },
  'os.build_id': {
    name: 'os.build_id',
    description: 'Unique identifier for a particular build or compilation of the operating system.',
    type: 'keyword',
    example: 'TQ3C.230805.001.B2',
  },
  'thread.id': {
    name: 'thread.id',
    description: 'Current "managed" thread ID (as opposed to OS thread ID).',
    type: 'long',
  },
  'thread.name': {
    name: 'thread.name',
    description: 'Current thread name.',
    type: 'keyword',
    example: 'm',
  },
  'azure.service.request.id': {
    name: 'azure.service.request.id',
    description:
      "The unique identifier of the service request. It's generated by the Azure service and returned with the response.",
    type: 'keyword',
    example: '00000000-0000-0000-0000-000000000000',
  },
  'azure.resource_provider.namespace': {
    name: 'azure.resource_provider.namespace',
    description:
      '[Azure Resource Provider Namespace](https://learn.microsoft.com/azure/azure-resource-manager/management/azure-services-resource-providers) as recognized by the client.',
    type: 'keyword',
    example: 'Microsoft.Storage',
  },
  'azure.client.id': {
    name: 'azure.client.id',
    description: 'The unique identifier of the client instance.',
    type: 'keyword',
    example: '3ba4827d-4422-483f-b59f-85b74211c11d',
  },
  'azure.cosmosdb.connection.mode': {
    name: 'azure.cosmosdb.connection.mode',
    description: 'Cosmos client connection mode.',
    type: 'keyword',
  },
  'azure.cosmosdb.operation.request_charge': {
    name: 'azure.cosmosdb.operation.request_charge',
    description: 'The number of request units consumed by the operation.',
    type: 'double',
    example: '46.18',
  },
  'azure.cosmosdb.request.body.size': {
    name: 'azure.cosmosdb.request.body.size',
    description: 'Request payload size in bytes.',
    type: 'long',
  },
  'azure.cosmosdb.operation.contacted_regions': {
    name: 'azure.cosmosdb.operation.contacted_regions',
    description:
      'List of regions contacted during operation in the order that they were contacted. If there is more than one region listed, it indicates that the operation was performed on multiple regions i.e. cross-regional call.',
    type: 'keyword',
    example: 'North Central US,Australia East,Australia Southeast',
  },
  'azure.cosmosdb.response.sub_status_code': {
    name: 'azure.cosmosdb.response.sub_status_code',
    description: 'Cosmos DB sub status code.',
    type: 'long',
    example: '1000',
  },
  'azure.cosmosdb.consistency.level': {
    name: 'azure.cosmosdb.consistency.level',
    description:
      'Account or request [consistency level](https://learn.microsoft.com/azure/cosmos-db/consistency-levels).',
    type: 'keyword',
    example: 'Eventual',
  },
  'feature_flag.key': {
    name: 'feature_flag.key',
    description: 'The lookup key of the feature flag.',
    type: 'keyword',
    example: 'logo-color',
  },
  'feature_flag.provider.name': {
    name: 'feature_flag.provider.name',
    description: 'Identifies the feature flag provider.',
    type: 'keyword',
    example: 'Flag Manager',
  },
  'feature_flag.result.variant': {
    name: 'feature_flag.result.variant',
    description: 'A semantic identifier for an evaluated flag value.',
    type: 'keyword',
    example: 'red',
  },
  'feature_flag.context.id': {
    name: 'feature_flag.context.id',
    description:
      'The unique identifier for the flag evaluation context. For example, the targeting key.',
    type: 'keyword',
    example: '5157782b-2203-4c80-a857-dbbd5e7761db',
  },
  'feature_flag.version': {
    name: 'feature_flag.version',
    description:
      'The version of the ruleset used during the evaluation. This may be any stable value which uniquely identifies the ruleset.',
    type: 'keyword',
    example: '1',
  },
  'feature_flag.set.id': {
    name: 'feature_flag.set.id',
    description:
      'The identifier of the [flag set](https://openfeature.dev/specification/glossary/#flag-set) to which the feature flag belongs.',
    type: 'keyword',
    example: 'proj-1',
  },
  'feature_flag.result.reason': {
    name: 'feature_flag.result.reason',
    description: 'The reason code which shows how a feature flag value was determined.',
    type: 'keyword',
    example: 'static',
  },
  'feature_flag.result.value': {
    name: 'feature_flag.result.value',
    description: 'The evaluated value of the feature flag.',
    type: 'keyword',
    example: '#ff0000',
  },
  'dns.question.name': {
    name: 'dns.question.name',
    description: 'The name being queried.',
    type: 'keyword',
    example: 'www.example.com',
  },
  'dns.answers': {
    name: 'dns.answers',
    description: 'The list of IPv4 or IPv6 addresses resolved during DNS lookup.',
    type: 'keyword',
    example: '10.0.0.1,2001:0db8:85a3:0000:0000:8a2e:0370:7334',
  },
  'cpu.mode': {
    name: 'cpu.mode',
    description: 'The mode of the CPU',
    type: 'keyword',
    example: 'user',
  },
  'cpu.logical_number': {
    name: 'cpu.logical_number',
    description: 'The logical CPU number [0..n-1]',
    type: 'long',
    example: '1',
  },
  'file.accessed': {
    name: 'file.accessed',
    description: 'Time when the file was last accessed, in ISO 8601 format.',
    type: 'keyword',
    example: 'Fri Jan 01 2021 13:00:00 GMT+0100 (Central European Standard Time)',
  },
  'file.attributes': {
    name: 'file.attributes',
    description: 'Array of file attributes.',
    type: 'keyword',
    example: 'readonly,hidden',
  },
  'file.created': {
    name: 'file.created',
    description: 'Time when the file was created, in ISO 8601 format.',
    type: 'keyword',
    example: 'Fri Jan 01 2021 13:00:00 GMT+0100 (Central European Standard Time)',
  },
  'file.changed': {
    name: 'file.changed',
    description: 'Time when the file attributes or metadata was last changed, in ISO 8601 format.',
    type: 'keyword',
    example: 'Fri Jan 01 2021 13:00:00 GMT+0100 (Central European Standard Time)',
  },
  'file.directory': {
    name: 'file.directory',
    description:
      'Directory where the file is located. It should include the drive letter, when appropriate.',
    type: 'keyword',
    example: '/home/user',
  },
  'file.extension': {
    name: 'file.extension',
    description: 'File extension, excluding the leading dot.',
    type: 'keyword',
    example: 'png',
  },
  'file.fork_name': {
    name: 'file.fork_name',
    description: 'Name of the fork. A fork is additional data associated with a filesystem object.',
    type: 'keyword',
    example: 'Zone.Identifier',
  },
  'file.group.id': {
    name: 'file.group.id',
    description: 'Primary Group ID (GID) of the file.',
    type: 'keyword',
    example: '1000',
  },
  'file.group.name': {
    name: 'file.group.name',
    description: 'Primary group name of the file.',
    type: 'keyword',
    example: 'users',
  },
  'file.inode': {
    name: 'file.inode',
    description: 'Inode representing the file in the filesystem.',
    type: 'keyword',
    example: '256383',
  },
  'file.mode': {
    name: 'file.mode',
    description: 'Mode of the file in octal representation.',
    type: 'keyword',
    example: '0640',
  },
  'file.modified': {
    name: 'file.modified',
    description: 'Time when the file content was last modified, in ISO 8601 format.',
    type: 'keyword',
    example: 'Fri Jan 01 2021 13:00:00 GMT+0100 (Central European Standard Time)',
  },
  'file.name': {
    name: 'file.name',
    description: 'Name of the file including the extension, without the directory.',
    type: 'keyword',
    example: 'example.png',
  },
  'file.owner.id': {
    name: 'file.owner.id',
    description: 'The user ID (UID) or security identifier (SID) of the file owner.',
    type: 'keyword',
    example: '1000',
  },
  'file.owner.name': {
    name: 'file.owner.name',
    description: 'Username of the file owner.',
    type: 'keyword',
    example: 'root',
  },
  'file.path': {
    name: 'file.path',
    description:
      'Full path to the file, including the file name. It should include the drive letter, when appropriate.',
    type: 'keyword',
    example: '/home/alice/example.png',
  },
  'file.size': {
    name: 'file.size',
    description: 'File size in bytes.',
    type: 'long',
  },
  'file.symbolic_link.target_path': {
    name: 'file.symbolic_link.target_path',
    description: 'Path to the target of a symbolic link.',
    type: 'keyword',
    example: '/usr/bin/python3',
  },
  'exception.type': {
    name: 'exception.type',
    description:
      'The type of the exception (its fully-qualified class name, if applicable). The dynamic type of the exception should be preferred over the static type in languages that support it.',
    type: 'keyword',
    example: 'java.net.ConnectException',
  },
  'exception.message': {
    name: 'exception.message',
    description: 'The exception message.',
    type: 'keyword',
    example: 'Division by zero',
  },
  'exception.stacktrace': {
    name: 'exception.stacktrace',
    description:
      'A stacktrace as a string in the natural representation for the language runtime. The representation is to be determined and documented by each language SIG.',
    type: 'keyword',
    example: 'E',
  },
  'url.domain': {
    name: 'url.domain',
    description: 'Domain extracted from the `url.full`, such as "opentelemetry.io".',
    type: 'keyword',
    example: 'www.foo.bar',
  },
  'url.extension': {
    name: 'url.extension',
    description: 'The file extension extracted from the `url.full`, excluding the leading dot.',
    type: 'keyword',
    example: 'png',
  },
  'url.fragment': {
    name: 'url.fragment',
    description: 'The [URI fragment](https://www.rfc-editor.org/rfc/rfc3986#section-3.5) component',
    type: 'keyword',
    example: 'SemConv',
  },
  'url.full': {
    name: 'url.full',
    description:
      'Absolute URL describing a network resource according to [RFC3986](https://www.rfc-editor.org/rfc/rfc3986)',
    type: 'keyword',
    example: 'https://www.foo.bar/search?q=OpenTelemetry#SemConv',
  },
  'url.original': {
    name: 'url.original',
    description: 'Unmodified original URL as seen in the event source.',
    type: 'keyword',
    example: 'https://www.foo.bar/search?q=OpenTelemetry#SemConv',
  },
  'url.path': {
    name: 'url.path',
    description: 'The [URI path](https://www.rfc-editor.org/rfc/rfc3986#section-3.3) component',
    type: 'keyword',
    example: '/search',
  },
  'url.port': {
    name: 'url.port',
    description: 'Port extracted from the `url.full`',
    type: 'long',
    example: '443',
  },
  'url.query': {
    name: 'url.query',
    description: 'The [URI query](https://www.rfc-editor.org/rfc/rfc3986#section-3.4) component',
    type: 'keyword',
    example: 'q=OpenTelemetry',
  },
  'url.registered_domain': {
    name: 'url.registered_domain',
    description: 'The highest registered url domain, stripped of the subdomain.',
    type: 'keyword',
    example: 'example.com',
  },
  'url.scheme': {
    name: 'url.scheme',
    description:
      'The [URI scheme](https://www.rfc-editor.org/rfc/rfc3986#section-3.1) component identifying the used protocol.',
    type: 'keyword',
    example: 'http',
  },
  'url.subdomain': {
    name: 'url.subdomain',
    description:
      'The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain. In a partially qualified domain, or if the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.',
    type: 'keyword',
    example: 'east',
  },
  'url.template': {
    name: 'url.template',
    description:
      'The low-cardinality template of an [absolute path reference](https://www.rfc-editor.org/rfc/rfc3986#section-4.2).',
    type: 'keyword',
    example: '/users/{id}',
  },
  'url.top_level_domain': {
    name: 'url.top_level_domain',
    description:
      'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is `com`.',
    type: 'keyword',
    example: 'com',
  },
  'device.id': {
    name: 'device.id',
    description: 'A unique identifier representing the device',
    type: 'keyword',
    example: '123456789012345',
  },
  'device.manufacturer': {
    name: 'device.manufacturer',
    description: 'The name of the device manufacturer',
    type: 'keyword',
    example: 'Apple',
  },
  'device.model.identifier': {
    name: 'device.model.identifier',
    description: 'The model identifier for the device',
    type: 'keyword',
    example: 'iPhone3,4',
  },
  'device.model.name': {
    name: 'device.model.name',
    description: 'The marketing name for the device model',
    type: 'keyword',
    example: 'iPhone 6s Plus',
  },
  'cloudevents.event_id': {
    name: 'cloudevents.event_id',
    description:
      'The [event_id](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#id) uniquely identifies the event.',
    type: 'keyword',
    example: '123e4567-e89b-12d3-a456-426614174000',
  },
  'cloudevents.event_source': {
    name: 'cloudevents.event_source',
    description:
      'The [source](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#source-1) identifies the context in which an event happened.',
    type: 'keyword',
    example: 'https://github.com/cloudevents',
  },
  'cloudevents.event_spec_version': {
    name: 'cloudevents.event_spec_version',
    description:
      'The [version of the CloudEvents specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#specversion) which the event uses.',
    type: 'keyword',
    example: '1',
  },
  'cloudevents.event_type': {
    name: 'cloudevents.event_type',
    description:
      'The [event_type](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#type) contains a value describing the type of event related to the originating occurrence.',
    type: 'keyword',
    example: 'com.github.pull_request.opened',
  },
  'cloudevents.event_subject': {
    name: 'cloudevents.event_subject',
    description:
      'The [subject](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#subject) of the event in the context of the event producer (identified by source).',
    type: 'keyword',
    example: 'm',
  },
  'android.os.api_level': {
    name: 'android.os.api_level',
    description:
      'Uniquely identifies the framework API revision offered by a version (`os.version`) of the android operating system. More information can be found in the [Android API levels documentation](https://developer.android.com/guide/topics/manifest/uses-sdk-element#ApiLevels).',
    type: 'keyword',
    example: '33',
  },
  'android.app.state': {
    name: 'android.app.state',
    description: 'This attribute represents the state of the application.',
    type: 'keyword',
    example: 'created',
  },
  'cicd.pipeline.name': {
    name: 'cicd.pipeline.name',
    description: 'The human readable name of the pipeline within a CI/CD system.',
    type: 'keyword',
    example: 'Build and Test',
  },
  'cicd.pipeline.run.id': {
    name: 'cicd.pipeline.run.id',
    description: 'The unique identifier of a pipeline run within a CI/CD system.',
    type: 'keyword',
    example: '120912',
  },
  'cicd.pipeline.run.url.full': {
    name: 'cicd.pipeline.run.url.full',
    description:
      'The [URL](https://wikipedia.org/wiki/URL) of the pipeline run, providing the complete address in order to locate and identify the pipeline run.',
    type: 'keyword',
    example:
      'https://github.com/open-telemetry/semantic-conventions/actions/runs/9753949763?pr=1075',
  },
  'cicd.pipeline.run.state': {
    name: 'cicd.pipeline.run.state',
    description: 'The pipeline run goes through these states during its lifecycle.',
    type: 'keyword',
    example: 'pending',
  },
  'cicd.pipeline.task.name': {
    name: 'cicd.pipeline.task.name',
    description:
      'The human readable name of a task within a pipeline. Task here most closely aligns with a [computing process](https://wikipedia.org/wiki/Pipeline_(computing)) in a pipeline. Other terms for tasks include commands, steps, and procedures.',
    type: 'keyword',
    example: 'Run GoLang Linter',
  },
  'cicd.pipeline.task.run.id': {
    name: 'cicd.pipeline.task.run.id',
    description: 'The unique identifier of a task run within a pipeline.',
    type: 'keyword',
    example: '12097',
  },
  'cicd.pipeline.task.run.url.full': {
    name: 'cicd.pipeline.task.run.url.full',
    description:
      'The [URL](https://wikipedia.org/wiki/URL) of the pipeline task run, providing the complete address in order to locate and identify the pipeline task run.',
    type: 'keyword',
    example:
      'https://github.com/open-telemetry/semantic-conventions/actions/runs/9753949763/job/26920038674?pr=1075',
  },
  'cicd.pipeline.task.run.result': {
    name: 'cicd.pipeline.task.run.result',
    description: 'The result of a task run.',
    type: 'keyword',
    example: 'success',
  },
  'cicd.pipeline.task.type': {
    name: 'cicd.pipeline.task.type',
    description: 'The type of the task within a pipeline.',
    type: 'keyword',
    example: 'build',
  },
  'cicd.pipeline.result': {
    name: 'cicd.pipeline.result',
    description: 'The result of a pipeline run.',
    type: 'keyword',
    example: 'success',
  },
  'cicd.pipeline.action.name': {
    name: 'cicd.pipeline.action.name',
    description: 'The kind of action a pipeline run is performing.',
    type: 'keyword',
    example: 'BUILD',
  },
  'cicd.worker.id': {
    name: 'cicd.worker.id',
    description: 'The unique identifier of a worker within a CICD system.',
    type: 'keyword',
    example: 'abc123',
  },
  'cicd.worker.name': {
    name: 'cicd.worker.name',
    description: 'The name of a worker within a CICD system.',
    type: 'keyword',
    example: 'agent-abc',
  },
  'cicd.worker.url.full': {
    name: 'cicd.worker.url.full',
    description:
      'The [URL](https://wikipedia.org/wiki/URL) of the worker, providing the complete address in order to locate and identify the worker.',
    type: 'keyword',
    example: 'https://cicd.example.org/worker/abc123',
  },
  'cicd.worker.state': {
    name: 'cicd.worker.state',
    description: 'The state of a CICD worker / agent.',
    type: 'keyword',
    example: 'idle',
  },
  'cicd.system.component': {
    name: 'cicd.system.component',
    description: 'The name of a component of the CICD system.',
    type: 'keyword',
    example: 'controller',
  },
  'cloud.provider': {
    name: 'cloud.provider',
    description: 'Name of the cloud provider.',
    type: 'keyword',
  },
  'cloud.account.id': {
    name: 'cloud.account.id',
    description: 'The cloud account ID the resource is assigned to.',
    type: 'keyword',
    example: '111111111111',
  },
  'cloud.region': {
    name: 'cloud.region',
    description:
      'The geographical region within a cloud provider. When associated with a resource, this attribute specifies the region where the resource operates. When calling services or APIs deployed on a cloud, this attribute identifies the region where the called destination is deployed.',
    type: 'keyword',
    example: 'us-central1',
  },
  'cloud.resource_id': {
    name: 'cloud.resource_id',
    description:
      'Cloud provider-specific native identifier of the monitored cloud resource (e.g. an [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) on AWS, a [fully qualified resource ID](https://learn.microsoft.com/rest/api/resources/resources/get-by-id) on Azure, a [full resource name](https://google.aip.dev/122#full-resource-names) on GCP)',
    type: 'keyword',
    example: 'arn:aws:lambda:REGION:ACCOUNT_ID:function:my-function',
  },
  'cloud.availability_zone': {
    name: 'cloud.availability_zone',
    description:
      'Cloud regions often have multiple, isolated locations known as zones to increase availability. Availability zone represents the zone where the resource is running.',
    type: 'keyword',
    example: 'us-east-1c',
  },
  'cloud.platform': {
    name: 'cloud.platform',
    description: 'The cloud platform in use.',
    type: 'keyword',
  },
  'otel.status_code': {
    name: 'otel.status_code',
    description:
      'Name of the code, either "OK" or "ERROR". MUST NOT be set if the status code is UNSET.',
    type: 'keyword',
  },
  'otel.status_description': {
    name: 'otel.status_description',
    description: 'Description of the Status if it has a value, otherwise not set.',
    type: 'keyword',
    example: 'resource not found',
  },
  'otel.span.sampling_result': {
    name: 'otel.span.sampling_result',
    description: 'The result value of the sampler for this span',
    type: 'keyword',
  },
  'otel.span.parent.origin': {
    name: 'otel.span.parent.origin',
    description:
      'Determines whether the span has a parent span, and if so, [whether it is a remote parent](https://opentelemetry.io/docs/specs/otel/trace/api/#isremote)',
    type: 'keyword',
  },
  'otel.scope.name': {
    name: 'otel.scope.name',
    description: 'The name of the instrumentation scope - (`InstrumentationScope.Name` in OTLP).',
    type: 'keyword',
    example: 'io.opentelemetry.contrib.mongodb',
  },
  'otel.scope.version': {
    name: 'otel.scope.version',
    description:
      'The version of the instrumentation scope - (`InstrumentationScope.Version` in OTLP).',
    type: 'keyword',
    example: '1.0.0',
  },
  'otel.scope.schema_url': {
    name: 'otel.scope.schema_url',
    description: 'The schema URL of the instrumentation scope.',
    type: 'keyword',
    example: 'https://opentelemetry.io/schemas/1.31.0',
  },
  'otel.component.type': {
    name: 'otel.component.type',
    description: 'A name identifying the type of the OpenTelemetry component.',
    type: 'keyword',
    example: 'otlp_grpc_span_exporter',
  },
  'otel.component.name': {
    name: 'otel.component.name',
    description:
      'A name uniquely identifying the instance of the OpenTelemetry component within its containing SDK instance.',
    type: 'keyword',
    example: 'otlp_grpc_span_exporter/0',
  },
  'hw.id': {
    name: 'hw.id',
    description: 'An identifier for the hardware component, unique within the monitored host',
    type: 'keyword',
    example: 'win32battery_battery_testsysa33_1',
  },
  'hw.name': {
    name: 'hw.name',
    description: 'An easily-recognizable name for the hardware component',
    type: 'keyword',
    example: 'eth0',
  },
  'hw.parent': {
    name: 'hw.parent',
    description:
      'Unique identifier of the parent component (typically the `hw.id` attribute of the enclosure, or disk controller)',
    type: 'keyword',
    example: 'dellStorage_perc_0',
  },
  'hw.type': {
    name: 'hw.type',
    description: 'Type of the component',
    type: 'keyword',
  },
  'hw.state': {
    name: 'hw.state',
    description: 'The current state of the component',
    type: 'keyword',
  },
  'hw.battery.state': {
    name: 'hw.battery.state',
    description: 'The current state of the battery',
    type: 'keyword',
  },
  'hw.limit_type': {
    name: 'hw.limit_type',
    description: 'Type of limit for hardware components',
    type: 'keyword',
    example: 'max',
  },
  'hw.bios_version': {
    name: 'hw.bios_version',
    description: 'BIOS version of the hardware component',
    type: 'keyword',
    example: '1.2.3',
  },
  'hw.driver_version': {
    name: 'hw.driver_version',
    description: 'Driver version for the hardware component',
    type: 'keyword',
    example: '10.2.1-3',
  },
  'hw.firmware_version': {
    name: 'hw.firmware_version',
    description: 'Firmware version of the hardware component',
    type: 'keyword',
    example: '2.0.1',
  },
  'hw.model': {
    name: 'hw.model',
    description: 'Descriptive model name of the hardware component',
    type: 'keyword',
    example: 'PERC H740P',
  },
  'hw.serial_number': {
    name: 'hw.serial_number',
    description: 'Serial number of the hardware component',
    type: 'keyword',
    example: 'CNFCP0123456789',
  },
  'hw.vendor': {
    name: 'hw.vendor',
    description: 'Vendor name of the hardware component',
    type: 'keyword',
    example: 'Dell',
  },
  'hw.sensor_location': {
    name: 'hw.sensor_location',
    description: 'Location of the sensor',
    type: 'keyword',
    example: 'cpu0',
  },
  'hw.battery.chemistry': {
    name: 'hw.battery.chemistry',
    description:
      'Battery [chemistry](https://schemas.dmtf.org/wbem/cim-html/2.31.0/CIM_Battery.html), e.g. Lithium-Ion, Nickel-Cadmium, etc.',
    type: 'keyword',
    example: 'Li-ion',
  },
  'hw.battery.capacity': {
    name: 'hw.battery.capacity',
    description: 'Design capacity in Watts-hours or Amper-hours',
    type: 'keyword',
    example: '9.3Ah',
  },
  'hw.enclosure.type': {
    name: 'hw.enclosure.type',
    description: 'Type of the enclosure (useful for modular systems)',
    type: 'keyword',
    example: 'Computer',
  },
  'hw.gpu.task': {
    name: 'hw.gpu.task',
    description: 'Type of task the GPU is performing',
    type: 'keyword',
    example: 'decoder',
  },
  'hw.logical_disk.raid_level': {
    name: 'hw.logical_disk.raid_level',
    description: 'RAID Level of the logical disk',
    type: 'keyword',
    example: 'RAID0+1',
  },
  'hw.logical_disk.state': {
    name: 'hw.logical_disk.state',
    description: 'State of the logical disk space usage',
    type: 'keyword',
    example: 'used',
  },
  'hw.memory.type': {
    name: 'hw.memory.type',
    description: 'Type of the memory module',
    type: 'keyword',
    example: 'DDR4',
  },
  'hw.network.logical_addresses': {
    name: 'hw.network.logical_addresses',
    description: 'Logical addresses of the adapter (e.g. IP address, or WWPN)',
    type: 'keyword',
    example: '172.16.8.21,57.11.193.42',
  },
  'hw.network.physical_address': {
    name: 'hw.network.physical_address',
    description: 'Physical address of the adapter (e.g. MAC address, or WWNN)',
    type: 'keyword',
    example: '00-90-F5-E9-7B-36',
  },
  'hw.physical_disk.type': {
    name: 'hw.physical_disk.type',
    description: 'Type of the physical disk',
    type: 'keyword',
    example: 'HDD',
  },
  'hw.physical_disk.state': {
    name: 'hw.physical_disk.state',
    description: 'State of the physical disk endurance utilization',
    type: 'keyword',
    example: 'remaining',
  },
  'hw.physical_disk.smart_attribute': {
    name: 'hw.physical_disk.smart_attribute',
    description:
      '[S.M.A.R.T.](https://wikipedia.org/wiki/S.M.A.R.T.) (Self-Monitoring, Analysis, and Reporting Technology) attribute of the physical disk',
    type: 'keyword',
    example: 'Spin Retry Count',
  },
  'hw.tape_drive.operation_type': {
    name: 'hw.tape_drive.operation_type',
    description: 'Type of tape drive operation',
    type: 'keyword',
    example: 'mount',
  },
  'zos.smf.id': {
    name: 'zos.smf.id',
    description:
      'The System Management Facility (SMF) Identifier uniquely identified a z/OS system within a SYSPLEX or mainframe environment and is used for system and performance analysis.',
    type: 'keyword',
    example: 'SYS1',
  },
  'zos.sysplex.name': {
    name: 'zos.sysplex.name',
    description: 'The name of the SYSPLEX to which the z/OS system belongs too.',
    type: 'keyword',
    example: 'SYSPLEX1',
  },
  'app.installation.id': {
    name: 'app.installation.id',
    description:
      'A unique identifier representing the installation of an application on a specific device',
    type: 'keyword',
    example: '2ab2916d-a51f-4ac8-80ee-45ac31a28092',
  },
  'app.jank.frame_count': {
    name: 'app.jank.frame_count',
    description: 'A number of frame renders that experienced jank.',
    type: 'long',
    example: '9',
  },
  'app.jank.threshold': {
    name: 'app.jank.threshold',
    description: 'The minimum rendering threshold for this jank, in seconds.',
    type: 'double',
    example: '0.016',
  },
  'app.jank.period': {
    name: 'app.jank.period',
    description: 'The time period, in seconds, for which this jank is being reported.',
    type: 'double',
    example: '1',
  },
  'app.screen.coordinate.x': {
    name: 'app.screen.coordinate.x',
    description: 'The x (horizontal) coordinate of a screen coordinate, in screen pixels.',
    type: 'long',
    example: '0',
  },
  'app.screen.coordinate.y': {
    name: 'app.screen.coordinate.y',
    description: 'The y (vertical) component of a screen coordinate, in screen pixels.',
    type: 'long',
    example: '12',
  },
  'app.widget.id': {
    name: 'app.widget.id',
    description:
      'An identifier that uniquely differentiates this widget from other widgets in the same application.',
    type: 'keyword',
    example: 'f9bc787d-ff05-48ad-90e1-fca1d46130b3',
  },
  'app.widget.name': {
    name: 'app.widget.name',
    description: 'The name of an application widget.',
    type: 'keyword',
    example: 'submit',
  },
  'app.build_id': {
    name: 'app.build_id',
    description: 'Unique identifier for a particular build or compilation of the application.',
    type: 'keyword',
    example: '6cff0a7e-cefc-4668-96f5-1273d8b334d0',
  },
  'faas.name': {
    name: 'faas.name',
    description: 'The name of the single function that this runtime instance executes.',
    type: 'keyword',
    example: 'my-function',
  },
  'faas.version': {
    name: 'faas.version',
    description: 'The immutable version of the function being executed.',
    type: 'keyword',
    example: '26',
  },
  'faas.instance': {
    name: 'faas.instance',
    description:
      'The execution environment ID as a string, that will be potentially reused for other invocations to the same function/function version.',
    type: 'keyword',
    example: '2021/06/28/[$LATEST]2f399eb14537447da05ab2a2e39309de',
  },
  'faas.max_memory': {
    name: 'faas.max_memory',
    description: 'The amount of memory available to the serverless function converted to Bytes.',
    type: 'long',
  },
  'faas.trigger': {
    name: 'faas.trigger',
    description: 'Type of the trigger which caused this function invocation.',
    type: 'keyword',
  },
  'faas.invoked_name': {
    name: 'faas.invoked_name',
    description: 'The name of the invoked function.',
    type: 'keyword',
    example: 'm',
  },
  'faas.invoked_provider': {
    name: 'faas.invoked_provider',
    description: 'The cloud provider of the invoked function.',
    type: 'keyword',
  },
  'faas.invoked_region': {
    name: 'faas.invoked_region',
    description: 'The cloud region of the invoked function.',
    type: 'keyword',
    example: 'e',
  },
  'faas.invocation_id': {
    name: 'faas.invocation_id',
    description: 'The invocation ID of the current function invocation.',
    type: 'keyword',
    example: 'a',
  },
  'faas.time': {
    name: 'faas.time',
    description:
      'A string containing the function invocation time in the [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) format expressed in [UTC](https://www.w3.org/TR/NOTE-datetime).',
    type: 'keyword',
  },
  'faas.cron': {
    name: 'faas.cron',
    description:
      'A string containing the schedule period as [Cron Expression](https://docs.oracle.com/cd/E12058_01/doc/doc.1014/e12030/cron_expressions.htm).',
    type: 'keyword',
    example: '0',
  },
  'faas.coldstart': {
    name: 'faas.coldstart',
    description:
      'A boolean that is true if the serverless function is executed for the first time (aka cold-start).',
    type: 'boolean',
  },
  'faas.document.collection': {
    name: 'faas.document.collection',
    description:
      'The name of the source on which the triggering operation was performed. For example, in Cloud Storage or S3 corresponds to the bucket name, and in Cosmos DB to the database name.',
    type: 'keyword',
    example: 'myBucketName',
  },
  'faas.document.operation': {
    name: 'faas.document.operation',
    description: 'Describes the type of the operation that was performed on the data.',
    type: 'keyword',
  },
  'faas.document.time': {
    name: 'faas.document.time',
    description:
      'A string containing the time when the data was accessed in the [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) format expressed in [UTC](https://www.w3.org/TR/NOTE-datetime).',
    type: 'keyword',
  },
  'faas.document.name': {
    name: 'faas.document.name',
    description:
      'The document name/table subjected to the operation. For example, in Cloud Storage or S3 is the name of the file, and in Cosmos DB the table name.',
    type: 'keyword',
    example: 'myFile.txt',
  },
  'process.pid': {
    name: 'process.pid',
    description: 'Process identifier (PID).',
    type: 'long',
    example: '1234',
  },
  'process.parent_pid': {
    name: 'process.parent_pid',
    description: 'Parent Process identifier (PPID).',
    type: 'long',
    example: '111',
  },
  'process.vpid': {
    name: 'process.vpid',
    description: 'Virtual process identifier.',
    type: 'long',
    example: '12',
  },
  'process.session_leader.pid': {
    name: 'process.session_leader.pid',
    description:
      "The PID of the process's session leader. This is also the session ID (SID) of the process.",
    type: 'long',
    example: '14',
  },
  'process.group_leader.pid': {
    name: 'process.group_leader.pid',
    description:
      "The PID of the process's group leader. This is also the process group ID (PGID) of the process.",
    type: 'long',
    example: '23',
  },
  'process.executable.build_id.gnu': {
    name: 'process.executable.build_id.gnu',
    description: 'The GNU build ID as found in the `.note.gnu.build-id` ELF section (hex string).',
    type: 'keyword',
    example: 'c89b11207f6479603b0d49bf291c092c2b719293',
  },
  'process.executable.build_id.go': {
    name: 'process.executable.build_id.go',
    description: 'The Go build ID as retrieved by `go tool buildid <go executable>`.',
    type: 'keyword',
    example: 'foh3mEXu7BLZjsN9pOwG/kATcXlYVCDEFouRMQed_/WwRFB1hPo9LBkekthSPG/x8hMC8emW2cCjXD0_1aY',
  },
  'process.executable.build_id.htlhash': {
    name: 'process.executable.build_id.htlhash',
    description:
      'Profiling specific build ID for executables. See the OTel specification for Profiles for more information.',
    type: 'keyword',
    example: '600DCAFE4A110000F2BF38C493F5FB92',
  },
  'process.executable.name': {
    name: 'process.executable.name',
    description:
      'The name of the process executable. On Linux based systems, this SHOULD be set to the base name of the target of `/proc/[pid]/exe`. On Windows, this SHOULD be set to the base name of `GetProcessImageFileNameW`.',
    type: 'keyword',
    example: 'otelcol',
  },
  'process.executable.path': {
    name: 'process.executable.path',
    description:
      'The full path to the process executable. On Linux based systems, can be set to the target of `proc/[pid]/exe`. On Windows, can be set to the result of `GetProcessImageFileNameW`.',
    type: 'keyword',
    example: '/usr/bin/cmd/otelcol',
  },
  'process.command': {
    name: 'process.command',
    description:
      'The command used to launch the process (i.e. the command name). On Linux based systems, can be set to the zeroth string in `proc/[pid]/cmdline`. On Windows, can be set to the first parameter extracted from `GetCommandLineW`.',
    type: 'keyword',
    example: 'cmd/otelcol',
  },
  'process.command_line': {
    name: 'process.command_line',
    description:
      'The full command used to launch the process as a single string representing the full command. On Windows, can be set to the result of `GetCommandLineW`. Do not set this if you have to assemble it just for monitoring; use `process.command_args` instead. SHOULD NOT be collected by default unless there is sanitization that excludes sensitive data.',
    type: 'keyword',
    example: 'C:\\cmd\\otecol --config="my directory\\config.yaml"',
  },
  'process.command_args': {
    name: 'process.command_args',
    description:
      'All the command arguments (including the command/executable itself) as received by the process. On Linux-based systems (and some other Unixoid systems supporting procfs), can be set according to the list of null-delimited strings extracted from `proc/[pid]/cmdline`. For libc-based executables, this would be the full argv vector passed to `main`. SHOULD NOT be collected by default unless there is sanitization that excludes sensitive data.',
    type: 'keyword',
    example: 'cmd/otecol,--config=config.yaml',
  },
  'process.args_count': {
    name: 'process.args_count',
    description: 'Length of the process.command_args array',
    type: 'long',
    example: '4',
  },
  'process.owner': {
    name: 'process.owner',
    description: 'The username of the user that owns the process.',
    type: 'keyword',
    example: 'root',
  },
  'process.user.id': {
    name: 'process.user.id',
    description: 'The effective user ID (EUID) of the process.',
    type: 'long',
    example: '1001',
  },
  'process.user.name': {
    name: 'process.user.name',
    description: 'The username of the effective user of the process.',
    type: 'keyword',
    example: 'root',
  },
  'process.real_user.id': {
    name: 'process.real_user.id',
    description: 'The real user ID (RUID) of the process.',
    type: 'long',
    example: '1000',
  },
  'process.real_user.name': {
    name: 'process.real_user.name',
    description: 'The username of the real user of the process.',
    type: 'keyword',
    example: 'operator',
  },
  'process.saved_user.id': {
    name: 'process.saved_user.id',
    description: 'The saved user ID (SUID) of the process.',
    type: 'long',
    example: '1002',
  },
  'process.saved_user.name': {
    name: 'process.saved_user.name',
    description: 'The username of the saved user.',
    type: 'keyword',
    example: 'operator',
  },
  'process.runtime.name': {
    name: 'process.runtime.name',
    description: 'The name of the runtime of this process.',
    type: 'keyword',
    example: 'OpenJDK Runtime Environment',
  },
  'process.runtime.version': {
    name: 'process.runtime.version',
    description:
      'The version of the runtime of this process, as returned by the runtime without modification.',
    type: 'keyword',
    example: '1',
  },
  'process.runtime.description': {
    name: 'process.runtime.description',
    description:
      'An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment.',
    type: 'keyword',
    example: 'E',
  },
  'process.title': {
    name: 'process.title',
    description: 'Process title (proctitle)',
    type: 'keyword',
    example: 'cat /etc/hostname',
  },
  'process.creation.time': {
    name: 'process.creation.time',
    description: 'The date and time the process was created, in ISO 8601 format.',
    type: 'keyword',
    example: 'Tue Nov 21 2023 10:25:34 GMT+0100 (Central European Standard Time)',
  },
  'process.exit.time': {
    name: 'process.exit.time',
    description: 'The date and time the process exited, in ISO 8601 format.',
    type: 'keyword',
    example: 'Tue Nov 21 2023 10:26:12 GMT+0100 (Central European Standard Time)',
  },
  'process.exit.code': {
    name: 'process.exit.code',
    description: 'The exit code of the process.',
    type: 'long',
    example: '127',
  },
  'process.interactive': {
    name: 'process.interactive',
    description: 'Whether the process is connected to an interactive shell.',
    type: 'boolean',
  },
  'process.working_directory': {
    name: 'process.working_directory',
    description: 'The working directory of the process.',
    type: 'keyword',
    example: '/root',
  },
  'process.context_switch_type': {
    name: 'process.context_switch_type',
    description:
      'Specifies whether the context switches for this data point were voluntary or involuntary.',
    type: 'keyword',
  },
  'process.paging.fault_type': {
    name: 'process.paging.fault_type',
    description:
      'The type of page fault for this data point. Type `major` is for major/hard page faults, and `minor` is for minor/soft page faults.',
    type: 'keyword',
  },
  'process.environment_variable': {
    name: 'process.environment_variable',
    description:
      'Process environment variables, `<key>` being the environment variable name, the value being the environment variable value.',
    type: 'keyword',
    example: 'ubuntu',
  },
  'process.linux.cgroup': {
    name: 'process.linux.cgroup',
    description: 'The control group associated with the process.',
    type: 'keyword',
    example: '1:name=systemd:/user.slice/user-1000.slice/session-3.scope',
  },
  'user.email': {
    name: 'user.email',
    description: 'User email address.',
    type: 'keyword',
    example: 'a.einstein@example.com',
  },
  'user.full_name': {
    name: 'user.full_name',
    description: "User's full name",
    type: 'keyword',
    example: 'Albert Einstein',
  },
  'user.hash': {
    name: 'user.hash',
    description: 'Unique user hash to correlate information for a user in anonymized form.',
    type: 'keyword',
    example: '364fc68eaf4c8acec74a4e52d7d1feaa',
  },
  'user.id': {
    name: 'user.id',
    description: 'Unique identifier of the user.',
    type: 'keyword',
    example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
  },
  'user.name': {
    name: 'user.name',
    description: 'Short name or login/username of the user.',
    type: 'keyword',
    example: 'a.einstein',
  },
  'user.roles': {
    name: 'user.roles',
    description: 'Array of user roles at the time of the event.',
    type: 'keyword',
    example: 'admin,reporting_user',
  },
  'session.id': {
    name: 'session.id',
    description: 'A unique id to identify a session.',
    type: 'keyword',
    example: '0',
  },
  'session.previous_id': {
    name: 'session.previous_id',
    description: 'The previous `session.id` for this user, when known.',
    type: 'keyword',
    example: '0',
  },
  'artifact.filename': {
    name: 'artifact.filename',
    description:
      'The human readable file name of the artifact, typically generated during build and release processes. Often includes the package name and version in the file name.',
    type: 'keyword',
    example: 'golang-binary-amd64-v0.1.0',
  },
  'artifact.version': {
    name: 'artifact.version',
    description: 'The version of the artifact.',
    type: 'keyword',
    example: 'v0.1.0',
  },
  'artifact.purl': {
    name: 'artifact.purl',
    description:
      'The [Package URL](https://github.com/package-url/purl-spec) of the [package artifact](https://slsa.dev/spec/v1.0/terminology#package-model) provides a standard way to identify and locate the packaged artifact.',
    type: 'keyword',
    example: 'pkg:github/package-url/purl-spec@1209109710924',
  },
  'artifact.hash': {
    name: 'artifact.hash',
    description:
      'The full [hash value (see glossary)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf), often found in checksum.txt on a release of the artifact and used to verify package integrity.',
    type: 'keyword',
    example: '9ff4c52759e2c4ac70b7d517bc7fcdc1cda631ca0045271ddd1b192544f8a3e9',
  },
  'artifact.attestation.id': {
    name: 'artifact.attestation.id',
    description: 'The id of the build [software attestation](https://slsa.dev/attestation-model).',
    type: 'keyword',
    example: '123',
  },
  'artifact.attestation.filename': {
    name: 'artifact.attestation.filename',
    description:
      'The provenance filename of the built attestation which directly relates to the build artifact filename. This filename SHOULD accompany the artifact at publish time. See the [SLSA Relationship](https://slsa.dev/spec/v1.0/distributing-provenance#relationship-between-artifacts-and-attestations) specification for more information.',
    type: 'keyword',
    example: 'golang-binary-amd64-v0.1.0.attestation',
  },
  'artifact.attestation.hash': {
    name: 'artifact.attestation.hash',
    description:
      'The full [hash value (see glossary)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf), of the built attestation. Some envelopes in the [software attestation space](https://github.com/in-toto/attestation/tree/main/spec) also refer to this as the **digest**.',
    type: 'keyword',
    example: '1b31dfcd5b7f9267bf2ff47651df1cfb9147b9e4df1f335accf65b4cda498408',
  },
  'destination.address': {
    name: 'destination.address',
    description:
      'Destination address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
    type: 'keyword',
    example: 'destination.example.com',
  },
  'destination.port': {
    name: 'destination.port',
    description: 'Destination port number',
    type: 'long',
    example: '3389',
  },
  'gcp.client.service': {
    name: 'gcp.client.service',
    description:
      'Identifies the Google Cloud service for which the official client library is intended.',
    type: 'keyword',
    example: 'appengine',
  },
  'gcp.cloud_run.job.execution': {
    name: 'gcp.cloud_run.job.execution',
    description:
      'The name of the Cloud Run [execution](https://cloud.google.com/run/docs/managing/job-executions) being run for the Job, as set by the [`CLOUD_RUN_EXECUTION`](https://cloud.google.com/run/docs/container-contract#jobs-env-vars) environment variable.',
    type: 'keyword',
    example: 'job-name-xxxx',
  },
  'gcp.cloud_run.job.task_index': {
    name: 'gcp.cloud_run.job.task_index',
    description:
      'The index for a task within an execution as provided by the [`CLOUD_RUN_TASK_INDEX`](https://cloud.google.com/run/docs/container-contract#jobs-env-vars) environment variable.',
    type: 'long',
    example: '0',
  },
  'gcp.apphub.application.container': {
    name: 'gcp.apphub.application.container',
    description: 'The container within GCP where the AppHub application is defined.',
    type: 'keyword',
    example: 'projects/my-container-project',
  },
  'gcp.apphub.application.location': {
    name: 'gcp.apphub.application.location',
    description: 'The GCP zone or region where the application is defined.',
    type: 'keyword',
    example: 'us-central1',
  },
  'gcp.apphub.application.id': {
    name: 'gcp.apphub.application.id',
    description: 'The name of the application as configured in AppHub.',
    type: 'keyword',
    example: 'my-application',
  },
  'gcp.apphub.service.id': {
    name: 'gcp.apphub.service.id',
    description: 'The name of the service as configured in AppHub.',
    type: 'keyword',
    example: 'my-service',
  },
  'gcp.apphub.service.environment_type': {
    name: 'gcp.apphub.service.environment_type',
    description: 'Environment of a service is the stage of a software lifecycle.',
    type: 'keyword',
  },
  'gcp.apphub.service.criticality_type': {
    name: 'gcp.apphub.service.criticality_type',
    description: 'Criticality of a service indicates its importance to the business.',
    type: 'keyword',
  },
  'gcp.apphub.workload.id': {
    name: 'gcp.apphub.workload.id',
    description: 'The name of the workload as configured in AppHub.',
    type: 'keyword',
    example: 'my-workload',
  },
  'gcp.apphub.workload.environment_type': {
    name: 'gcp.apphub.workload.environment_type',
    description: 'Environment of a workload is the stage of a software lifecycle.',
    type: 'keyword',
  },
  'gcp.apphub.workload.criticality_type': {
    name: 'gcp.apphub.workload.criticality_type',
    description: 'Criticality of a workload indicates its importance to the business.',
    type: 'keyword',
  },
  'gcp.gce.instance.name': {
    name: 'gcp.gce.instance.name',
    description:
      'The instance name of a GCE instance. This is the value provided by `host.name`, the visible name of the instance in the Cloud Console UI, and the prefix for the default hostname of the instance as defined by the [default internal DNS name](https://cloud.google.com/compute/docs/internal-dns#instance-fully-qualified-domain-names).',
    type: 'keyword',
    example: 'instance-1',
  },
  'gcp.gce.instance.hostname': {
    name: 'gcp.gce.instance.hostname',
    description:
      'The hostname of a GCE instance. This is the full value of the default or [custom hostname](https://cloud.google.com/compute/docs/instances/custom-hostname-vm).',
    type: 'keyword',
    example: 'my-host1234.example.com',
  },
  'gen_ai.provider.name': {
    name: 'gen_ai.provider.name',
    description:
      'The Generative AI provider as identified by the client or server instrumentation.',
    type: 'keyword',
  },
  'gen_ai.request.model': {
    name: 'gen_ai.request.model',
    description: 'The name of the GenAI model a request is being made to.',
    type: 'keyword',
    example: 'g',
  },
  'gen_ai.request.max_tokens': {
    name: 'gen_ai.request.max_tokens',
    description: 'The maximum number of tokens the model generates for a request.',
    type: 'long',
    example: '100',
  },
  'gen_ai.request.choice.count': {
    name: 'gen_ai.request.choice.count',
    description: 'The target number of candidate completions to return.',
    type: 'long',
    example: '3',
  },
  'gen_ai.request.temperature': {
    name: 'gen_ai.request.temperature',
    description: 'The temperature setting for the GenAI request.',
    type: 'double',
    example: '0',
  },
  'gen_ai.request.top_p': {
    name: 'gen_ai.request.top_p',
    description: 'The top_p sampling setting for the GenAI request.',
    type: 'double',
    example: '1',
  },
  'gen_ai.request.top_k': {
    name: 'gen_ai.request.top_k',
    description: 'The top_k sampling setting for the GenAI request.',
    type: 'double',
    example: '1',
  },
  'gen_ai.request.stop_sequences': {
    name: 'gen_ai.request.stop_sequences',
    description: 'List of sequences that the model will use to stop generating further tokens.',
    type: 'keyword',
    example: 'forest,lived',
  },
  'gen_ai.request.frequency_penalty': {
    name: 'gen_ai.request.frequency_penalty',
    description: 'The frequency penalty setting for the GenAI request.',
    type: 'double',
    example: '0.1',
  },
  'gen_ai.request.presence_penalty': {
    name: 'gen_ai.request.presence_penalty',
    description: 'The presence penalty setting for the GenAI request.',
    type: 'double',
    example: '0.1',
  },
  'gen_ai.request.encoding_formats': {
    name: 'gen_ai.request.encoding_formats',
    description: 'The encoding formats requested in an embeddings operation, if specified.',
    type: 'keyword',
    example: 'base64',
  },
  'gen_ai.request.seed': {
    name: 'gen_ai.request.seed',
    description: 'Requests with same seed value more likely to return same result.',
    type: 'long',
    example: '100',
  },
  'gen_ai.response.id': {
    name: 'gen_ai.response.id',
    description: 'The unique identifier for the completion.',
    type: 'keyword',
    example: 'chatcmpl-123',
  },
  'gen_ai.response.model': {
    name: 'gen_ai.response.model',
    description: 'The name of the model that generated the response.',
    type: 'keyword',
    example: 'gpt-4-0613',
  },
  'gen_ai.response.finish_reasons': {
    name: 'gen_ai.response.finish_reasons',
    description:
      'Array of reasons the model stopped generating tokens, corresponding to each generation received.',
    type: 'keyword',
    example: 'stop',
  },
  'gen_ai.usage.input_tokens': {
    name: 'gen_ai.usage.input_tokens',
    description: 'The number of tokens used in the GenAI input (prompt).',
    type: 'long',
    example: '100',
  },
  'gen_ai.usage.output_tokens': {
    name: 'gen_ai.usage.output_tokens',
    description: 'The number of tokens used in the GenAI response (completion).',
    type: 'long',
    example: '180',
  },
  'gen_ai.token.type': {
    name: 'gen_ai.token.type',
    description: 'The type of token being counted.',
    type: 'keyword',
    example: 'input',
  },
  'gen_ai.conversation.id': {
    name: 'gen_ai.conversation.id',
    description:
      'The unique identifier for a conversation (session, thread), used to store and correlate messages within this conversation.',
    type: 'keyword',
    example: 'conv_5j66UpCpwteGg4YSxUnt7lPY',
  },
  'gen_ai.agent.id': {
    name: 'gen_ai.agent.id',
    description: 'The unique identifier of the GenAI agent.',
    type: 'keyword',
    example: 'asst_5j66UpCpwteGg4YSxUnt7lPY',
  },
  'gen_ai.agent.name': {
    name: 'gen_ai.agent.name',
    description: 'Human-readable name of the GenAI agent provided by the application.',
    type: 'keyword',
    example: 'Math Tutor',
  },
  'gen_ai.agent.description': {
    name: 'gen_ai.agent.description',
    description: 'Free-form description of the GenAI agent provided by the application.',
    type: 'keyword',
    example: 'Helps with math problems',
  },
  'gen_ai.tool.name': {
    name: 'gen_ai.tool.name',
    description: 'Name of the tool utilized by the agent.',
    type: 'keyword',
    example: 'Flights',
  },
  'gen_ai.tool.call.id': {
    name: 'gen_ai.tool.call.id',
    description: 'The tool call identifier.',
    type: 'keyword',
    example: 'call_mszuSIzqtI65i1wAUOE8w5H4',
  },
  'gen_ai.tool.description': {
    name: 'gen_ai.tool.description',
    description: 'The tool description.',
    type: 'keyword',
    example: 'Multiply two numbers',
  },
  'gen_ai.tool.type': {
    name: 'gen_ai.tool.type',
    description: 'Type of the tool utilized by the agent',
    type: 'keyword',
    example: 'function',
  },
  'gen_ai.data_source.id': {
    name: 'gen_ai.data_source.id',
    description: 'The data source identifier.',
    type: 'keyword',
    example: 'H7STPQYOND',
  },
  'gen_ai.operation.name': {
    name: 'gen_ai.operation.name',
    description: 'The name of the operation being performed.',
    type: 'keyword',
  },
  'gen_ai.output.type': {
    name: 'gen_ai.output.type',
    description: 'Represents the content type requested by the client.',
    type: 'keyword',
  },
  'gen_ai.embeddings.dimension.count': {
    name: 'gen_ai.embeddings.dimension.count',
    description: 'The number of dimensions the resulting output embeddings should have.',
    type: 'long',
    example: '512',
  },
  'gen_ai.system_instructions': {
    name: 'gen_ai.system_instructions',
    description:
      'The system message or instructions provided to the GenAI model separately from the chat history.',
    type: 'keyword',
    example:
      '[{"type":"text","content":"You are an Agent that greet users, always use greetings tool to respond"}]',
  },
  'gen_ai.input.messages': {
    name: 'gen_ai.input.messages',
    description: 'The chat history provided to the model as an input.',
    type: 'keyword',
    example:
      '[{"role":"user","parts":[{"type":"text","content":"Weather in Paris?"}]},{"role":"assistant","parts":[{"type":"tool_call","id":"call_VSPygqKTWdrhaFErNvMV18Yl","name":"get_weather","arguments":{"location":"Paris"}}]},{"role":"tool","parts":[{"type":"tool_call_response","id":" call_VSPygqKTWdrhaFErNvMV18Yl","result":"rainy, 57°F"}]}]',
  },
  'gen_ai.output.messages': {
    name: 'gen_ai.output.messages',
    description:
      'Messages returned by the model where each message represents a specific model response (choice, candidate).',
    type: 'keyword',
    example:
      '[{"role":"assistant","parts":[{"type":"text","content":"The weather in Paris is currently rainy with a temperature of 57°F."}],"finish_reason":"stop"}]',
  },
  'gen_ai.evaluation.name': {
    name: 'gen_ai.evaluation.name',
    description: 'The name of the evaluation metric used for the GenAI response.',
    type: 'keyword',
    example: 'Relevance',
  },
  'gen_ai.evaluation.score.value': {
    name: 'gen_ai.evaluation.score.value',
    description: 'The evaluation score returned by the evaluator.',
    type: 'double',
    example: '4',
  },
  'gen_ai.evaluation.score.label': {
    name: 'gen_ai.evaluation.score.label',
    description: 'Human readable label for evaluation.',
    type: 'keyword',
    example: 'relevant',
  },
  'gen_ai.evaluation.explanation': {
    name: 'gen_ai.evaluation.explanation',
    description: 'A free-form explanation for the assigned score provided by the evaluator.',
    type: 'keyword',
    example:
      'The response is factually accurate but lacks sufficient detail to fully address the question.',
  },
  'opentracing.ref_type': {
    name: 'opentracing.ref_type',
    description: 'Parent-child Reference type',
    type: 'keyword',
  },
  'dotnet.gc.heap.generation': {
    name: 'dotnet.gc.heap.generation',
    description: 'Name of the garbage collector managed heap generation.',
    type: 'keyword',
    example: 'gen0',
  },
  'graphql.operation.name': {
    name: 'graphql.operation.name',
    description: 'The name of the operation being executed.',
    type: 'keyword',
    example: 'f',
  },
  'graphql.operation.type': {
    name: 'graphql.operation.type',
    description: 'The type of the operation being executed.',
    type: 'keyword',
    example: 'query',
  },
  'graphql.document': {
    name: 'graphql.document',
    description: 'The GraphQL document being executed.',
    type: 'keyword',
    example: 'q',
  },
  'v8js.gc.type': {
    name: 'v8js.gc.type',
    description: 'The type of garbage collection.',
    type: 'keyword',
  },
  'v8js.heap.space.name': {
    name: 'v8js.heap.space.name',
    description: 'The name of the space type of heap memory.',
    type: 'keyword',
  },
  'oci.manifest.digest': {
    name: 'oci.manifest.digest',
    description:
      'The digest of the OCI image manifest. For container images specifically is the digest by which the container image is known.',
    type: 'keyword',
    example: 'sha256:e4ca62c0d62f3e886e684806dfe9d4e0cda60d54986898173c1083856cfda0f4',
  },
  'vcs.repository.url.full': {
    name: 'vcs.repository.url.full',
    description:
      'The [canonical URL](https://support.google.com/webmasters/answer/10347851?hl=en#:~:text=A%20canonical%20URL%20is%20the,Google%20chooses%20one%20as%20canonical.) of the repository providing the complete HTTP(S) address in order to locate and identify the repository through a browser.',
    type: 'keyword',
    example: 'https://github.com/opentelemetry/open-telemetry-collector-contrib',
  },
  'vcs.repository.name': {
    name: 'vcs.repository.name',
    description:
      'The human readable name of the repository. It SHOULD NOT include any additional identifier like Group/SubGroup in GitLab or organization in GitHub.',
    type: 'keyword',
    example: 'semantic-conventions',
  },
  'vcs.ref.base.name': {
    name: 'vcs.ref.base.name',
    description:
      'The name of the [reference](https://git-scm.com/docs/gitglossary#def_ref) such as **branch** or **tag** in the repository.',
    type: 'keyword',
    example: 'my-feature-branch',
  },
  'vcs.ref.base.type': {
    name: 'vcs.ref.base.type',
    description:
      'The type of the [reference](https://git-scm.com/docs/gitglossary#def_ref) in the repository.',
    type: 'keyword',
    example: 'branch',
  },
  'vcs.ref.base.revision': {
    name: 'vcs.ref.base.revision',
    description:
      'The revision, literally [revised version](https://www.merriam-webster.com/dictionary/revision), The revision most often refers to a commit object in Git, or a revision number in SVN.',
    type: 'keyword',
    example: '9d59409acf479dfa0df1aa568182e43e43df8bbe28d60fcf2bc52e30068802cc',
  },
  'vcs.ref.head.name': {
    name: 'vcs.ref.head.name',
    description:
      'The name of the [reference](https://git-scm.com/docs/gitglossary#def_ref) such as **branch** or **tag** in the repository.',
    type: 'keyword',
    example: 'my-feature-branch',
  },
  'vcs.ref.head.type': {
    name: 'vcs.ref.head.type',
    description:
      'The type of the [reference](https://git-scm.com/docs/gitglossary#def_ref) in the repository.',
    type: 'keyword',
    example: 'branch',
  },
  'vcs.ref.head.revision': {
    name: 'vcs.ref.head.revision',
    description:
      'The revision, literally [revised version](https://www.merriam-webster.com/dictionary/revision), The revision most often refers to a commit object in Git, or a revision number in SVN.',
    type: 'keyword',
    example: '9d59409acf479dfa0df1aa568182e43e43df8bbe28d60fcf2bc52e30068802cc',
  },
  'vcs.ref.type': {
    name: 'vcs.ref.type',
    description:
      'The type of the [reference](https://git-scm.com/docs/gitglossary#def_ref) in the repository.',
    type: 'keyword',
    example: 'branch',
  },
  'vcs.revision_delta.direction': {
    name: 'vcs.revision_delta.direction',
    description: 'The type of revision comparison.',
    type: 'keyword',
    example: 'ahead',
  },
  'vcs.line_change.type': {
    name: 'vcs.line_change.type',
    description: 'The type of line change being measured on a branch or change.',
    type: 'keyword',
    example: 'added',
  },
  'vcs.change.title': {
    name: 'vcs.change.title',
    description:
      'The human readable title of the change (pull request/merge request/changelist). This title is often a brief summary of the change and may get merged in to a ref as the commit summary.',
    type: 'keyword',
    example: 'Fixes broken thing',
  },
  'vcs.change.id': {
    name: 'vcs.change.id',
    description:
      'The ID of the change (pull request/merge request/changelist) if applicable. This is usually a unique (within repository) identifier generated by the VCS system.',
    type: 'keyword',
    example: '123',
  },
  'vcs.change.state': {
    name: 'vcs.change.state',
    description: 'The state of the change (pull request/merge request/changelist).',
    type: 'keyword',
    example: 'open',
  },
  'vcs.owner.name': {
    name: 'vcs.owner.name',
    description: 'The group owner within the version control system.',
    type: 'keyword',
    example: 'my-org',
  },
  'vcs.provider.name': {
    name: 'vcs.provider.name',
    description: 'The name of the version control system provider.',
    type: 'keyword',
    example: 'github',
  },
  'source.address': {
    name: 'source.address',
    description:
      'Source address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
    type: 'keyword',
    example: 'source.example.com',
  },
  'source.port': {
    name: 'source.port',
    description: 'Source port number',
    type: 'long',
    example: '3389',
  },
  'cpython.gc.generation': {
    name: 'cpython.gc.generation',
    description: 'Value of the garbage collector collection generation.',
    type: 'keyword',
    example: '0',
  },
  'mainframe.lpar.name': {
    name: 'mainframe.lpar.name',
    description:
      'Name of the logical partition that hosts a systems with a mainframe operating system.',
    type: 'keyword',
    example: 'LPAR01',
  },
  'log.iostream': {
    name: 'log.iostream',
    description: 'The stream associated with the log. See below for a list of well-known values.',
    type: 'keyword',
  },
  'log.file.name': {
    name: 'log.file.name',
    description: 'The basename of the file.',
    type: 'keyword',
    example: 'audit.log',
  },
  'log.file.path': {
    name: 'log.file.path',
    description: 'The full path to the file.',
    type: 'keyword',
    example: '/var/log/mysql/audit.log',
  },
  'log.file.name_resolved': {
    name: 'log.file.name_resolved',
    description: 'The basename of the file, with symlinks resolved.',
    type: 'keyword',
    example: 'uuid.log',
  },
  'log.file.path_resolved': {
    name: 'log.file.path_resolved',
    description: 'The full path to the file, with symlinks resolved.',
    type: 'keyword',
    example: '/var/lib/docker/uuid.log',
  },
  'log.record.uid': {
    name: 'log.record.uid',
    description: 'A unique identifier for the Log Record.',
    type: 'keyword',
    example: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  },
  'log.record.original': {
    name: 'log.record.original',
    description: 'The complete original Log Record.',
    type: 'keyword',
    example: '77 <86>1 2015-08-06T21:58:59.694Z 192.168.2.133 inactive - - - Something happened',
  },
  'telemetry.sdk.name': {
    name: 'telemetry.sdk.name',
    description: 'The name of the telemetry SDK as defined above.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'telemetry.sdk.language': {
    name: 'telemetry.sdk.language',
    description: 'The language of the telemetry SDK.',
    type: 'keyword',
  },
  'telemetry.sdk.version': {
    name: 'telemetry.sdk.version',
    description: 'The version string of the telemetry SDK.',
    type: 'keyword',
    example: '1.2.3',
  },
  'telemetry.distro.name': {
    name: 'telemetry.distro.name',
    description: 'The name of the auto instrumentation agent or distribution, if used.',
    type: 'keyword',
    example: 'parts-unlimited-java',
  },
  'telemetry.distro.version': {
    name: 'telemetry.distro.version',
    description: 'The version string of the auto instrumentation agent or distribution, if used.',
    type: 'keyword',
    example: '1.2.3',
  },
  'aws.request_id': {
    name: 'aws.request_id',
    description:
      'The AWS request ID as returned in the response headers `x-amzn-requestid`, `x-amzn-request-id` or `x-amz-request-id`.',
    type: 'keyword',
    example: '79b9da39-b7ae-508a-a6bc-864b2829c622',
  },
  'aws.extended_request_id': {
    name: 'aws.extended_request_id',
    description: 'The AWS extended request ID as returned in the response header `x-amz-id-2`.',
    type: 'keyword',
    example: 'wzHcyEWfmOGDIE5QOhTAqFDoDWP3y8IUvpNINCwL9N4TEHbUw0/gZJ+VZTmCNCWR7fezEN3eCiQ=',
  },
  'aws.dynamodb.table_names': {
    name: 'aws.dynamodb.table_names',
    description: 'The keys in the `RequestItems` object field.',
    type: 'keyword',
    example: 'Users,Cats',
  },
  'aws.dynamodb.consumed_capacity': {
    name: 'aws.dynamodb.consumed_capacity',
    description: 'The JSON-serialized value of each item in the `ConsumedCapacity` response field.',
    type: 'keyword',
    example:
      '{ "CapacityUnits": number, "GlobalSecondaryIndexes": { "string" : { "CapacityUnits": number, "ReadCapacityUnits": number, "WriteCapacityUnits": number } }, "LocalSecondaryIndexes": { "string" : { "CapacityUnits": number, "ReadCapacityUnits": number, "WriteCapacityUnits": number } }, "ReadCapacityUnits": number, "Table": { "CapacityUnits": number, "ReadCapacityUnits": number, "WriteCapacityUnits": number }, "TableName": "string", "WriteCapacityUnits": number }',
  },
  'aws.dynamodb.item_collection_metrics': {
    name: 'aws.dynamodb.item_collection_metrics',
    description: 'The JSON-serialized value of the `ItemCollectionMetrics` response field.',
    type: 'keyword',
    example:
      '{ "string" : [ { "ItemCollectionKey": { "string" : { "B": blob, "BOOL": boolean, "BS": [ blob ], "L": [ "AttributeValue" ], "M": { "string" : "AttributeValue" }, "N": "string", "NS": [ "string" ], "NULL": boolean, "S": "string", "SS": [ "string" ] } }, "SizeEstimateRangeGB": [ number ] } ] }',
  },
  'aws.dynamodb.provisioned_read_capacity': {
    name: 'aws.dynamodb.provisioned_read_capacity',
    description: 'The value of the `ProvisionedThroughput.ReadCapacityUnits` request parameter.',
    type: 'double',
    example: '1',
  },
  'aws.dynamodb.provisioned_write_capacity': {
    name: 'aws.dynamodb.provisioned_write_capacity',
    description: 'The value of the `ProvisionedThroughput.WriteCapacityUnits` request parameter.',
    type: 'double',
    example: '1',
  },
  'aws.dynamodb.consistent_read': {
    name: 'aws.dynamodb.consistent_read',
    description: 'The value of the `ConsistentRead` request parameter.',
    type: 'boolean',
  },
  'aws.dynamodb.projection': {
    name: 'aws.dynamodb.projection',
    description: 'The value of the `ProjectionExpression` request parameter.',
    type: 'keyword',
    example: 'Title',
  },
  'aws.dynamodb.limit': {
    name: 'aws.dynamodb.limit',
    description: 'The value of the `Limit` request parameter.',
    type: 'long',
    example: '10',
  },
  'aws.dynamodb.attributes_to_get': {
    name: 'aws.dynamodb.attributes_to_get',
    description: 'The value of the `AttributesToGet` request parameter.',
    type: 'keyword',
    example: 'lives,id',
  },
  'aws.dynamodb.index_name': {
    name: 'aws.dynamodb.index_name',
    description: 'The value of the `IndexName` request parameter.',
    type: 'keyword',
    example: 'name_to_group',
  },
  'aws.dynamodb.select': {
    name: 'aws.dynamodb.select',
    description: 'The value of the `Select` request parameter.',
    type: 'keyword',
    example: 'ALL_ATTRIBUTES',
  },
  'aws.dynamodb.global_secondary_indexes': {
    name: 'aws.dynamodb.global_secondary_indexes',
    description:
      'The JSON-serialized value of each item of the `GlobalSecondaryIndexes` request field',
    type: 'keyword',
    example:
      '{ "IndexName": "string", "KeySchema": [ { "AttributeName": "string", "KeyType": "string" } ], "Projection": { "NonKeyAttributes": [ "string" ], "ProjectionType": "string" }, "ProvisionedThroughput": { "ReadCapacityUnits": number, "WriteCapacityUnits": number } }',
  },
  'aws.dynamodb.local_secondary_indexes': {
    name: 'aws.dynamodb.local_secondary_indexes',
    description:
      'The JSON-serialized value of each item of the `LocalSecondaryIndexes` request field.',
    type: 'keyword',
    example:
      '{ "IndexArn": "string", "IndexName": "string", "IndexSizeBytes": number, "ItemCount": number, "KeySchema": [ { "AttributeName": "string", "KeyType": "string" } ], "Projection": { "NonKeyAttributes": [ "string" ], "ProjectionType": "string" } }',
  },
  'aws.dynamodb.exclusive_start_table': {
    name: 'aws.dynamodb.exclusive_start_table',
    description: 'The value of the `ExclusiveStartTableName` request parameter.',
    type: 'keyword',
    example: 'Users',
  },
  'aws.dynamodb.table_count': {
    name: 'aws.dynamodb.table_count',
    description: 'The number of items in the `TableNames` response parameter.',
    type: 'long',
    example: '20',
  },
  'aws.dynamodb.scan_forward': {
    name: 'aws.dynamodb.scan_forward',
    description: 'The value of the `ScanIndexForward` request parameter.',
    type: 'boolean',
  },
  'aws.dynamodb.segment': {
    name: 'aws.dynamodb.segment',
    description: 'The value of the `Segment` request parameter.',
    type: 'long',
    example: '10',
  },
  'aws.dynamodb.total_segments': {
    name: 'aws.dynamodb.total_segments',
    description: 'The value of the `TotalSegments` request parameter.',
    type: 'long',
    example: '100',
  },
  'aws.dynamodb.count': {
    name: 'aws.dynamodb.count',
    description: 'The value of the `Count` response parameter.',
    type: 'long',
    example: '10',
  },
  'aws.dynamodb.scanned_count': {
    name: 'aws.dynamodb.scanned_count',
    description: 'The value of the `ScannedCount` response parameter.',
    type: 'long',
    example: '50',
  },
  'aws.dynamodb.attribute_definitions': {
    name: 'aws.dynamodb.attribute_definitions',
    description:
      'The JSON-serialized value of each item in the `AttributeDefinitions` request field.',
    type: 'keyword',
    example: '{"AttributeName":"string","AttributeType":"string"}',
  },
  'aws.dynamodb.global_secondary_index_updates': {
    name: 'aws.dynamodb.global_secondary_index_updates',
    description:
      'The JSON-serialized value of each item in the `GlobalSecondaryIndexUpdates` request field.',
    type: 'keyword',
    example:
      '{ "Create": { "IndexName": "string", "KeySchema": [ { "AttributeName": "string", "KeyType": "string" } ], "Projection": { "NonKeyAttributes": [ "string" ], "ProjectionType": "string" }, "ProvisionedThroughput": { "ReadCapacityUnits": number, "WriteCapacityUnits": number } }',
  },
  'aws.ecs.container.arn': {
    name: 'aws.ecs.container.arn',
    description:
      'The Amazon Resource Name (ARN) of an [ECS container instance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).',
    type: 'keyword',
    example: 'arn:aws:ecs:us-west-1:123456789123:container/32624152-9086-4f0e-acae-1a75b14fe4d9',
  },
  'aws.ecs.cluster.arn': {
    name: 'aws.ecs.cluster.arn',
    description:
      'The ARN of an [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html).',
    type: 'keyword',
    example: 'arn:aws:ecs:us-west-2:123456789123:cluster/my-cluster',
  },
  'aws.ecs.launchtype': {
    name: 'aws.ecs.launchtype',
    description:
      'The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.',
    type: 'keyword',
  },
  'aws.ecs.task.arn': {
    name: 'aws.ecs.task.arn',
    description:
      'The ARN of a running [ECS task](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-account-settings.html#ecs-resource-ids).',
    type: 'keyword',
    example: 'arn:aws:ecs:us-west-1:123456789123:task/10838bed-421f-43ef-870a-f43feacbbb5b',
  },
  'aws.ecs.task.family': {
    name: 'aws.ecs.task.family',
    description:
      'The family name of the [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) used to create the ECS task.',
    type: 'keyword',
    example: 'opentelemetry-family',
  },
  'aws.ecs.task.id': {
    name: 'aws.ecs.task.id',
    description: 'The ID of a running ECS task. The ID MUST be extracted from `task.arn`.',
    type: 'keyword',
    example: '10838bed-421f-43ef-870a-f43feacbbb5b',
  },
  'aws.ecs.task.revision': {
    name: 'aws.ecs.task.revision',
    description: 'The revision for the task definition used to create the ECS task.',
    type: 'keyword',
    example: '8',
  },
  'aws.eks.cluster.arn': {
    name: 'aws.eks.cluster.arn',
    description: 'The ARN of an EKS cluster.',
    type: 'keyword',
    example: 'arn:aws:ecs:us-west-2:123456789123:cluster/my-cluster',
  },
  'aws.log.group.names': {
    name: 'aws.log.group.names',
    description: 'The name(s) of the AWS log group(s) an application is writing to.',
    type: 'keyword',
    example: '/aws/lambda/my-function,opentelemetry-service',
  },
  'aws.log.group.arns': {
    name: 'aws.log.group.arns',
    description: 'The Amazon Resource Name(s) (ARN) of the AWS log group(s).',
    type: 'keyword',
    example: 'arn:aws:logs:us-west-1:123456789012:log-group:/aws/my/group:*',
  },
  'aws.log.stream.names': {
    name: 'aws.log.stream.names',
    description: 'The name(s) of the AWS log stream(s) an application is writing to.',
    type: 'keyword',
    example: 'logs/main/10838bed-421f-43ef-870a-f43feacbbb5b',
  },
  'aws.log.stream.arns': {
    name: 'aws.log.stream.arns',
    description: 'The ARN(s) of the AWS log stream(s).',
    type: 'keyword',
    example:
      'arn:aws:logs:us-west-1:123456789012:log-group:/aws/my/group:log-stream:logs/main/10838bed-421f-43ef-870a-f43feacbbb5b',
  },
  'aws.lambda.invoked_arn': {
    name: 'aws.lambda.invoked_arn',
    description:
      'The full invoked ARN as provided on the `Context` passed to the function (`Lambda-Runtime-Invoked-Function-Arn` header on the `/runtime/invocation/next` applicable).',
    type: 'keyword',
    example: 'arn:aws:lambda:us-east-1:123456:function:myfunction:myalias',
  },
  'aws.lambda.resource_mapping.id': {
    name: 'aws.lambda.resource_mapping.id',
    description:
      "The UUID of the [AWS Lambda EvenSource Mapping](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html). An event source is mapped to a lambda function. It's contents are read by Lambda and used to trigger a function. This isn't available in the lambda execution context or the lambda runtime environtment. This is going to be populated by the AWS SDK for each language when that UUID is present. Some of these operations are Create/Delete/Get/List/Update EventSourceMapping.",
    type: 'keyword',
    example: '587ad24b-03b9-4413-8202-bbd56b36e5b7',
  },
  'aws.s3.bucket': {
    name: 'aws.s3.bucket',
    description:
      'The S3 bucket name the request refers to. Corresponds to the `--bucket` parameter of the [S3 API](https://docs.aws.amazon.com/cli/latest/reference/s3api/index.html) operations.',
    type: 'keyword',
    example: 'some-bucket-name',
  },
  'aws.s3.key': {
    name: 'aws.s3.key',
    description:
      'The S3 object key the request refers to. Corresponds to the `--key` parameter of the [S3 API](https://docs.aws.amazon.com/cli/latest/reference/s3api/index.html) operations.',
    type: 'keyword',
    example: 'someFile.yml',
  },
  'aws.s3.copy_source': {
    name: 'aws.s3.copy_source',
    description: 'The source object (in the form `bucket`/`key`) for the copy operation.',
    type: 'keyword',
    example: 'someFile.yml',
  },
  'aws.s3.upload_id': {
    name: 'aws.s3.upload_id',
    description: 'Upload ID that identifies the multipart upload.',
    type: 'keyword',
    example: 'dfRtDYWFbkRONycy.Yxwh66Yjlx.cph0gtNBtJ',
  },
  'aws.s3.delete': {
    name: 'aws.s3.delete',
    description: 'The delete request container that specifies the objects to be deleted.',
    type: 'keyword',
    example: 'Objects=[{Key=string,VersionId=string},{Key=string,VersionId=string}],Quiet=boolean',
  },
  'aws.s3.part_number': {
    name: 'aws.s3.part_number',
    description:
      'The part number of the part being uploaded in a multipart-upload operation. This is a positive integer between 1 and 10,000.',
    type: 'long',
    example: '3456',
  },
  'aws.sqs.queue.url': {
    name: 'aws.sqs.queue.url',
    description:
      "The URL of the AWS SQS Queue. It's a unique identifier for a queue in Amazon Simple Queue Service (SQS) and is used to access the queue and perform actions on it.",
    type: 'keyword',
    example: 'https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue',
  },
  'aws.sns.topic.arn': {
    name: 'aws.sns.topic.arn',
    description:
      'The ARN of the AWS SNS Topic. An Amazon SNS [topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html) is a logical access point that acts as a communication channel.',
    type: 'keyword',
    example: 'arn:aws:sns:us-east-1:123456789012:mystack-mytopic-NZJ5JSMVGFIE',
  },
  'aws.kinesis.stream_name': {
    name: 'aws.kinesis.stream_name',
    description:
      'The name of the AWS Kinesis [stream](https://docs.aws.amazon.com/streams/latest/dev/introduction.html) the request refers to. Corresponds to the `--stream-name` parameter of the Kinesis [describe-stream](https://docs.aws.amazon.com/cli/latest/reference/kinesis/describe-stream.html) operation.',
    type: 'keyword',
    example: 'some-stream-name',
  },
  'aws.step_functions.activity.arn': {
    name: 'aws.step_functions.activity.arn',
    description: 'The ARN of the AWS Step Functions Activity.',
    type: 'keyword',
    example: 'arn:aws:states:us-east-1:123456789012:activity:get-greeting',
  },
  'aws.step_functions.state_machine.arn': {
    name: 'aws.step_functions.state_machine.arn',
    description: 'The ARN of the AWS Step Functions State Machine.',
    type: 'keyword',
    example: 'arn:aws:states:us-east-1:123456789012:stateMachine:myStateMachine:1',
  },
  'aws.secretsmanager.secret.arn': {
    name: 'aws.secretsmanager.secret.arn',
    description: 'The ARN of the Secret stored in the Secrets Mangger',
    type: 'keyword',
    example: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:SecretName-6RandomCharacters',
  },
  'aws.bedrock.guardrail.id': {
    name: 'aws.bedrock.guardrail.id',
    description:
      'The unique identifier of the AWS Bedrock Guardrail. A [guardrail](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) helps safeguard and prevent unwanted behavior from model responses or user messages.',
    type: 'keyword',
    example: 'sgi5gkybzqak',
  },
  'aws.bedrock.knowledge_base.id': {
    name: 'aws.bedrock.knowledge_base.id',
    description:
      'The unique identifier of the AWS Bedrock Knowledge base. A [knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) is a bank of information that can be queried by models to generate more relevant responses and augment prompts.',
    type: 'keyword',
    example: 'XFWUPB9PAW',
  },
  'test.suite.name': {
    name: 'test.suite.name',
    description:
      'The human readable name of a [test suite](https://wikipedia.org/wiki/Test_suite).',
    type: 'keyword',
    example: 'TestSuite1',
  },
  'test.suite.run.status': {
    name: 'test.suite.run.status',
    description: 'The status of the test suite run.',
    type: 'keyword',
    example: 'success',
  },
  'test.case.name': {
    name: 'test.case.name',
    description:
      'The fully qualified human readable name of the [test case](https://wikipedia.org/wiki/Test_case).',
    type: 'keyword',
    example: 'org.example.TestCase1.test1',
  },
  'test.case.result.status': {
    name: 'test.case.result.status',
    description: 'The status of the actual test case result from test execution.',
    type: 'keyword',
    example: 'pass',
  },
  'k8s.cluster.name': {
    name: 'k8s.cluster.name',
    description: 'The name of the cluster.',
    type: 'keyword',
    example: 'opentelemetry-cluster',
  },
  'k8s.cluster.uid': {
    name: 'k8s.cluster.uid',
    description: 'A pseudo-ID for the cluster, set to the UID of the `kube-system` namespace.',
    type: 'keyword',
    example: '218fc5a9-a5f1-4b54-aa05-46717d0ab26d',
  },
  'k8s.node.name': {
    name: 'k8s.node.name',
    description: 'The name of the Node.',
    type: 'keyword',
    example: 'node-1',
  },
  'k8s.node.uid': {
    name: 'k8s.node.uid',
    description: 'The UID of the Node.',
    type: 'keyword',
    example: '1eb3a0c6-0477-4080-a9cb-0cb7db65c6a2',
  },
  'k8s.node.label': {
    name: 'k8s.node.label',
    description:
      'The label placed on the Node, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'arm64',
  },
  'k8s.node.annotation': {
    name: 'k8s.node.annotation',
    description:
      'The annotation placed on the Node, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '0',
  },
  'k8s.namespace.name': {
    name: 'k8s.namespace.name',
    description: 'The name of the namespace that the pod is running in.',
    type: 'keyword',
    example: 'default',
  },
  'k8s.namespace.label': {
    name: 'k8s.namespace.label',
    description:
      'The label placed on the Namespace, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'default',
  },
  'k8s.namespace.annotation': {
    name: 'k8s.namespace.annotation',
    description:
      'The annotation placed on the Namespace, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '0',
  },
  'k8s.pod.uid': {
    name: 'k8s.pod.uid',
    description: 'The UID of the Pod.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.pod.name': {
    name: 'k8s.pod.name',
    description: 'The name of the Pod.',
    type: 'keyword',
    example: 'opentelemetry-pod-autoconf',
  },
  'k8s.pod.label': {
    name: 'k8s.pod.label',
    description:
      'The label placed on the Pod, the `<key>` being the label name, the value being the label value.',
    type: 'keyword',
    example: 'my-app',
  },
  'k8s.pod.annotation': {
    name: 'k8s.pod.annotation',
    description:
      'The annotation placed on the Pod, the `<key>` being the annotation name, the value being the annotation value.',
    type: 'keyword',
    example: 'true',
  },
  'k8s.container.name': {
    name: 'k8s.container.name',
    description:
      'The name of the Container from Pod specification, must be unique within a Pod. Container runtime usually uses different globally unique name (`container.name`).',
    type: 'keyword',
    example: 'redis',
  },
  'k8s.container.restart_count': {
    name: 'k8s.container.restart_count',
    description:
      'Number of times the container was restarted. This attribute can be used to identify a particular container (running or stopped) within a container spec.',
    type: 'long',
  },
  'k8s.container.status.last_terminated_reason': {
    name: 'k8s.container.status.last_terminated_reason',
    description: 'Last terminated reason of the Container.',
    type: 'keyword',
    example: 'Evicted',
  },
  'k8s.replicaset.uid': {
    name: 'k8s.replicaset.uid',
    description: 'The UID of the ReplicaSet.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.replicaset.name': {
    name: 'k8s.replicaset.name',
    description: 'The name of the ReplicaSet.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.replicaset.label': {
    name: 'k8s.replicaset.label',
    description:
      'The label placed on the ReplicaSet, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'guestbook',
  },
  'k8s.replicaset.annotation': {
    name: 'k8s.replicaset.annotation',
    description:
      'The annotation placed on the ReplicaSet, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '0',
  },
  'k8s.replicationcontroller.uid': {
    name: 'k8s.replicationcontroller.uid',
    description: 'The UID of the replication controller.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.replicationcontroller.name': {
    name: 'k8s.replicationcontroller.name',
    description: 'The name of the replication controller.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.resourcequota.uid': {
    name: 'k8s.resourcequota.uid',
    description: 'The UID of the resource quota.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.resourcequota.name': {
    name: 'k8s.resourcequota.name',
    description: 'The name of the resource quota.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.deployment.uid': {
    name: 'k8s.deployment.uid',
    description: 'The UID of the Deployment.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.deployment.name': {
    name: 'k8s.deployment.name',
    description: 'The name of the Deployment.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.deployment.label': {
    name: 'k8s.deployment.label',
    description:
      'The label placed on the Deployment, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'guestbook',
  },
  'k8s.deployment.annotation': {
    name: 'k8s.deployment.annotation',
    description:
      'The annotation placed on the Deployment, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '1',
  },
  'k8s.statefulset.uid': {
    name: 'k8s.statefulset.uid',
    description: 'The UID of the StatefulSet.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.statefulset.name': {
    name: 'k8s.statefulset.name',
    description: 'The name of the StatefulSet.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.statefulset.label': {
    name: 'k8s.statefulset.label',
    description:
      'The label placed on the StatefulSet, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'guestbook',
  },
  'k8s.statefulset.annotation': {
    name: 'k8s.statefulset.annotation',
    description:
      'The annotation placed on the StatefulSet, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '1',
  },
  'k8s.daemonset.uid': {
    name: 'k8s.daemonset.uid',
    description: 'The UID of the DaemonSet.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.daemonset.name': {
    name: 'k8s.daemonset.name',
    description: 'The name of the DaemonSet.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.daemonset.label': {
    name: 'k8s.daemonset.label',
    description:
      'The label placed on the DaemonSet, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'guestbook',
  },
  'k8s.daemonset.annotation': {
    name: 'k8s.daemonset.annotation',
    description:
      'The annotation placed on the DaemonSet, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '1',
  },
  'k8s.hpa.uid': {
    name: 'k8s.hpa.uid',
    description: 'The UID of the horizontal pod autoscaler.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.hpa.name': {
    name: 'k8s.hpa.name',
    description: 'The name of the horizontal pod autoscaler.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.hpa.scaletargetref.kind': {
    name: 'k8s.hpa.scaletargetref.kind',
    description: 'The kind of the target resource to scale for the HorizontalPodAutoscaler.',
    type: 'keyword',
    example: 'Deployment',
  },
  'k8s.hpa.scaletargetref.name': {
    name: 'k8s.hpa.scaletargetref.name',
    description: 'The name of the target resource to scale for the HorizontalPodAutoscaler.',
    type: 'keyword',
    example: 'my-deployment',
  },
  'k8s.hpa.scaletargetref.api_version': {
    name: 'k8s.hpa.scaletargetref.api_version',
    description: 'The API version of the target resource to scale for the HorizontalPodAutoscaler.',
    type: 'keyword',
    example: 'apps/v1',
  },
  'k8s.hpa.metric.type': {
    name: 'k8s.hpa.metric.type',
    description: 'The type of metric source for the horizontal pod autoscaler.',
    type: 'keyword',
    example: 'Resource',
  },
  'k8s.job.uid': {
    name: 'k8s.job.uid',
    description: 'The UID of the Job.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.job.name': {
    name: 'k8s.job.name',
    description: 'The name of the Job.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.job.label': {
    name: 'k8s.job.label',
    description:
      'The label placed on the Job, the `<key>` being the label name, the value being the label value, even if the value is empty.',
    type: 'keyword',
    example: 'ci',
  },
  'k8s.job.annotation': {
    name: 'k8s.job.annotation',
    description:
      'The annotation placed on the Job, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
    type: 'keyword',
    example: '1',
  },
  'k8s.cronjob.uid': {
    name: 'k8s.cronjob.uid',
    description: 'The UID of the CronJob.',
    type: 'keyword',
    example: '275ecb36-5aa8-4c2a-9c47-d8bb681b9aff',
  },
  'k8s.cronjob.name': {
    name: 'k8s.cronjob.name',
    description: 'The name of the CronJob.',
    type: 'keyword',
    example: 'opentelemetry',
  },
  'k8s.cronjob.label': {
    name: 'k8s.cronjob.label',
    description:
      'The label placed on the CronJob, the `<key>` being the label name, the value being the label value.',
    type: 'keyword',
    example: 'weekly',
  },
  'k8s.cronjob.annotation': {
    name: 'k8s.cronjob.annotation',
    description:
      'The cronjob annotation placed on the CronJob, the `<key>` being the annotation name, the value being the annotation value.',
    type: 'keyword',
    example: '4',
  },
  'k8s.volume.name': {
    name: 'k8s.volume.name',
    description: 'The name of the K8s volume.',
    type: 'keyword',
    example: 'volume0',
  },
  'k8s.volume.type': {
    name: 'k8s.volume.type',
    description: 'The type of the K8s volume.',
    type: 'keyword',
    example: 'emptyDir',
  },
  'k8s.namespace.phase': {
    name: 'k8s.namespace.phase',
    description: 'The phase of the K8s namespace.',
    type: 'keyword',
    example: 'active',
  },
  'k8s.node.condition.type': {
    name: 'k8s.node.condition.type',
    description: 'The condition type of a K8s Node.',
    type: 'keyword',
    example: 'Ready',
  },
  'k8s.node.condition.status': {
    name: 'k8s.node.condition.status',
    description: 'The status of the condition, one of True, False, Unknown.',
    type: 'keyword',
    example: 'true',
  },
  'k8s.container.status.state': {
    name: 'k8s.container.status.state',
    description:
      'The state of the container. [K8s ContainerState](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#containerstate-v1-core)',
    type: 'keyword',
    example: 'terminated',
  },
  'k8s.container.status.reason': {
    name: 'k8s.container.status.reason',
    description:
      'The reason for the container state. Corresponds to the `reason` field of the: [K8s ContainerStateWaiting](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#containerstatewaiting-v1-core) or [K8s ContainerStateTerminated](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#containerstateterminated-v1-core)',
    type: 'keyword',
    example: 'ContainerCreating',
  },
  'k8s.hugepage.size': {
    name: 'k8s.hugepage.size',
    description: 'The size (identifier) of the K8s huge page.',
    type: 'keyword',
    example: '2Mi',
  },
  'k8s.storageclass.name': {
    name: 'k8s.storageclass.name',
    description:
      'The name of K8s [StorageClass](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#storageclass-v1-storage-k8s-io) object.',
    type: 'keyword',
    example: 'gold.storageclass.storage.k8s.io',
  },
  'k8s.resourcequota.resource_name': {
    name: 'k8s.resourcequota.resource_name',
    description: 'The name of the K8s resource a resource quota defines.',
    type: 'keyword',
    example: 'count/replicationcontrollers',
  },
  'error.type': {
    name: 'error.type',
    description: 'Describes a class of error the operation ended with.',
    type: 'keyword',
    example: 'timeout',
  },
  'error.message': {
    name: 'error.message',
    description: 'A message providing more detail about an error in human-readable form.',
    type: 'keyword',
    example: 'Unexpected input type: string',
  },
  'service.name': {
    name: 'service.name',
    description: 'Logical name of the service.',
    type: 'keyword',
    example: 'shoppingcart',
  },
  'service.version': {
    name: 'service.version',
    description:
      'The version string of the service API or implementation. The format is not defined by these conventions.',
    type: 'keyword',
    example: '2.0.0',
  },
  'service.namespace': {
    name: 'service.namespace',
    description: 'A namespace for `service.name`.',
    type: 'keyword',
    example: 'Shop',
  },
  'service.instance.id': {
    name: 'service.instance.id',
    description: 'The string ID of the service instance.',
    type: 'keyword',
    example: '627cc493-f310-47de-96bd-71410b7dec09',
  },
  'go.memory.type': {
    name: 'go.memory.type',
    description: 'The type of memory.',
    type: 'keyword',
    example: 'other',
  },
  'network.carrier.icc': {
    name: 'network.carrier.icc',
    description:
      'The ISO 3166-1 alpha-2 2-character country code associated with the mobile carrier network.',
    type: 'keyword',
    example: 'D',
  },
  'network.carrier.mcc': {
    name: 'network.carrier.mcc',
    description: 'The mobile carrier country code.',
    type: 'keyword',
    example: '3',
  },
  'network.carrier.mnc': {
    name: 'network.carrier.mnc',
    description: 'The mobile carrier network code.',
    type: 'keyword',
    example: '0',
  },
  'network.carrier.name': {
    name: 'network.carrier.name',
    description: 'The name of the mobile carrier.',
    type: 'keyword',
    example: 's',
  },
  'network.connection.subtype': {
    name: 'network.connection.subtype',
    description:
      'This describes more details regarding the connection.type. It may be the type of cell technology connection, but it could be used for describing details about a wifi connection.',
    type: 'keyword',
    example: 'L',
  },
  'network.connection.type': {
    name: 'network.connection.type',
    description: 'The internet connection type.',
    type: 'keyword',
    example: 'w',
  },
  'network.local.address': {
    name: 'network.local.address',
    description: 'Local address of the network connection - IP address or Unix domain socket name.',
    type: 'keyword',
    example: '10.1.2.80',
  },
  'network.local.port': {
    name: 'network.local.port',
    description: 'Local port number of the network connection.',
    type: 'long',
    example: '65123',
  },
  'network.peer.address': {
    name: 'network.peer.address',
    description: 'Peer address of the network connection - IP address or Unix domain socket name.',
    type: 'keyword',
    example: '10.1.2.80',
  },
  'network.peer.port': {
    name: 'network.peer.port',
    description: 'Peer port number of the network connection.',
    type: 'long',
    example: '65123',
  },
  'network.protocol.name': {
    name: 'network.protocol.name',
    description:
      '[OSI application layer](https://wikipedia.org/wiki/Application_layer) or non-OSI equivalent.',
    type: 'keyword',
    example: 'http',
  },
  'network.protocol.version': {
    name: 'network.protocol.version',
    description: 'The actual version of the protocol used for network communication.',
    type: 'keyword',
    example: '1.1',
  },
  'network.transport': {
    name: 'network.transport',
    description:
      '[OSI transport layer](https://wikipedia.org/wiki/Transport_layer) or [inter-process communication method](https://wikipedia.org/wiki/Inter-process_communication).',
    type: 'keyword',
    example: 'tcp',
  },
  'network.type': {
    name: 'network.type',
    description:
      '[OSI network layer](https://wikipedia.org/wiki/Network_layer) or non-OSI equivalent.',
    type: 'keyword',
    example: 'ipv4',
  },
  'network.io.direction': {
    name: 'network.io.direction',
    description: 'The network IO operation direction.',
    type: 'keyword',
    example: 'transmit',
  },
  'network.interface.name': {
    name: 'network.interface.name',
    description: 'The network interface name.',
    type: 'keyword',
    example: 'lo',
  },
  'network.connection.state': {
    name: 'network.connection.state',
    description: 'The state of network connection',
    type: 'keyword',
    example: 'close_wait',
  },
  'ios.app.state': {
    name: 'ios.app.state',
    description: 'This attribute represents the state of the application.',
    type: 'keyword',
  },
  'disk.io.direction': {
    name: 'disk.io.direction',
    description: 'The disk IO operation direction.',
    type: 'keyword',
    example: 'read',
  },
  'heroku.release.creation_timestamp': {
    name: 'heroku.release.creation_timestamp',
    description: 'Time and date the release was created',
    type: 'keyword',
    example: 'Sun Oct 23 2022 20:00:42 GMT+0200 (Central European Summer Time)',
  },
  'heroku.release.commit': {
    name: 'heroku.release.commit',
    description: 'Commit hash for the current release',
    type: 'keyword',
    example: 'e6134959463efd8966b20e75b913cafe3f5ec',
  },
  'heroku.app.id': {
    name: 'heroku.app.id',
    description: 'Unique identifier for the application',
    type: 'keyword',
    example: '2daa2797-e42b-4624-9322-ec3f968df4da',
  },
  'elasticsearch.node.name': {
    name: 'elasticsearch.node.name',
    description:
      'Represents the human-readable identifier of the node/instance to which a request was routed.',
    type: 'keyword',
    example: 'instance-0000000001',
  },
  'tls.cipher': {
    name: 'tls.cipher',
    description:
      'String indicating the [cipher](https://datatracker.ietf.org/doc/html/rfc5246#appendix-A.5) used during the current connection.',
    type: 'keyword',
    example: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
  },
  'tls.client.certificate': {
    name: 'tls.client.certificate',
    description:
      'PEM-encoded stand-alone certificate offered by the client. This is usually mutually-exclusive of `client.certificate_chain` since this value also exists in that list.',
    type: 'keyword',
    example: 'MII...',
  },
  'tls.client.certificate_chain': {
    name: 'tls.client.certificate_chain',
    description:
      'Array of PEM-encoded certificates that make up the certificate chain offered by the client. This is usually mutually-exclusive of `client.certificate` since that value should be the first certificate in the chain.',
    type: 'keyword',
    example: 'MII...,MI...',
  },
  'tls.client.hash.md5': {
    name: 'tls.client.hash.md5',
    description:
      'Certificate fingerprint using the MD5 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.',
    type: 'keyword',
    example: '0F76C7F2C55BFD7D8E8B8F4BFBF0C9EC',
  },
  'tls.client.hash.sha1': {
    name: 'tls.client.hash.sha1',
    description:
      'Certificate fingerprint using the SHA1 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.',
    type: 'keyword',
    example: '9E393D93138888D288266C2D915214D1D1CCEB2A',
  },
  'tls.client.hash.sha256': {
    name: 'tls.client.hash.sha256',
    description:
      'Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.',
    type: 'keyword',
    example: '0687F666A054EF17A08E2F2162EAB4CBC0D265E1D7875BE74BF3C712CA92DAF0',
  },
  'tls.client.issuer': {
    name: 'tls.client.issuer',
    description:
      'Distinguished name of [subject](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.6) of the issuer of the x.509 certificate presented by the client.',
    type: 'keyword',
    example: 'CN=Example Root CA, OU=Infrastructure Team, DC=example, DC=com',
  },
  'tls.client.ja3': {
    name: 'tls.client.ja3',
    description: 'A hash that identifies clients based on how they perform an SSL/TLS handshake.',
    type: 'keyword',
    example: 'd4e5b18d6b55c71272893221c96ba240',
  },
  'tls.client.not_after': {
    name: 'tls.client.not_after',
    description: 'Date/Time indicating when client certificate is no longer considered valid.',
    type: 'keyword',
    example: 'Fri Jan 01 2021 01:00:00 GMT+0100 (Central European Standard Time)',
  },
  'tls.client.not_before': {
    name: 'tls.client.not_before',
    description: 'Date/Time indicating when client certificate is first considered valid.',
    type: 'keyword',
    example: 'Thu Jan 01 1970 01:00:00 GMT+0100 (Central European Standard Time)',
  },
  'tls.client.subject': {
    name: 'tls.client.subject',
    description: 'Distinguished name of subject of the x.509 certificate presented by the client.',
    type: 'keyword',
    example: 'CN=myclient, OU=Documentation Team, DC=example, DC=com',
  },
  'tls.client.supported_ciphers': {
    name: 'tls.client.supported_ciphers',
    description: 'Array of ciphers offered by the client during the client hello.',
    type: 'keyword',
    example: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
  },
  'tls.curve': {
    name: 'tls.curve',
    description: 'String indicating the curve used for the given cipher, when applicable',
    type: 'keyword',
    example: 'secp256r1',
  },
  'tls.established': {
    name: 'tls.established',
    description:
      'Boolean flag indicating if the TLS negotiation was successful and transitioned to an encrypted tunnel.',
    type: 'boolean',
    example: 'true',
  },
  'tls.next_protocol': {
    name: 'tls.next_protocol',
    description:
      'String indicating the protocol being tunneled. Per the values in the [IANA registry](https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids), this string should be lower case.',
    type: 'keyword',
    example: 'http/1.1',
  },
  'tls.protocol.name': {
    name: 'tls.protocol.name',
    description:
      'Normalized lowercase protocol name parsed from original string of the negotiated [SSL/TLS protocol version](https://docs.openssl.org/1.1.1/man3/SSL_get_version/#return-values)',
    type: 'keyword',
  },
  'tls.protocol.version': {
    name: 'tls.protocol.version',
    description:
      'Numeric part of the version parsed from the original string of the negotiated [SSL/TLS protocol version](https://docs.openssl.org/1.1.1/man3/SSL_get_version/#return-values)',
    type: 'keyword',
    example: '1.2',
  },
  'tls.resumed': {
    name: 'tls.resumed',
    description:
      'Boolean flag indicating if this TLS connection was resumed from an existing TLS negotiation.',
    type: 'boolean',
    example: 'true',
  },
  'tls.server.certificate': {
    name: 'tls.server.certificate',
    description:
      'PEM-encoded stand-alone certificate offered by the server. This is usually mutually-exclusive of `server.certificate_chain` since this value also exists in that list.',
    type: 'keyword',
    example: 'MII...',
  },
  'tls.server.certificate_chain': {
    name: 'tls.server.certificate_chain',
    description:
      'Array of PEM-encoded certificates that make up the certificate chain offered by the server. This is usually mutually-exclusive of `server.certificate` since that value should be the first certificate in the chain.',
    type: 'keyword',
    example: 'MII...,MI...',
  },
  'tls.server.hash.md5': {
    name: 'tls.server.hash.md5',
    description:
      'Certificate fingerprint using the MD5 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.',
    type: 'keyword',
    example: '0F76C7F2C55BFD7D8E8B8F4BFBF0C9EC',
  },
  'tls.server.hash.sha1': {
    name: 'tls.server.hash.sha1',
    description:
      'Certificate fingerprint using the SHA1 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.',
    type: 'keyword',
    example: '9E393D93138888D288266C2D915214D1D1CCEB2A',
  },
  'tls.server.hash.sha256': {
    name: 'tls.server.hash.sha256',
    description:
      'Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.',
    type: 'keyword',
    example: '0687F666A054EF17A08E2F2162EAB4CBC0D265E1D7875BE74BF3C712CA92DAF0',
  },
  'tls.server.issuer': {
    name: 'tls.server.issuer',
    description:
      'Distinguished name of [subject](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.6) of the issuer of the x.509 certificate presented by the client.',
    type: 'keyword',
    example: 'CN=Example Root CA, OU=Infrastructure Team, DC=example, DC=com',
  },
  'tls.server.ja3s': {
    name: 'tls.server.ja3s',
    description: 'A hash that identifies servers based on how they perform an SSL/TLS handshake.',
    type: 'keyword',
    example: 'd4e5b18d6b55c71272893221c96ba240',
  },
  'tls.server.not_after': {
    name: 'tls.server.not_after',
    description: 'Date/Time indicating when server certificate is no longer considered valid.',
    type: 'keyword',
    example: 'Fri Jan 01 2021 01:00:00 GMT+0100 (Central European Standard Time)',
  },
  'tls.server.not_before': {
    name: 'tls.server.not_before',
    description: 'Date/Time indicating when server certificate is first considered valid.',
    type: 'keyword',
    example: 'Thu Jan 01 1970 01:00:00 GMT+0100 (Central European Standard Time)',
  },
  'tls.server.subject': {
    name: 'tls.server.subject',
    description: 'Distinguished name of subject of the x.509 certificate presented by the server.',
    type: 'keyword',
    example: 'CN=myserver, OU=Documentation Team, DC=example, DC=com',
  },
  'messaging.batch.message_count': {
    name: 'messaging.batch.message_count',
    description:
      'The number of messages sent, received, or processed in the scope of the batching operation.',
    type: 'long',
    example: '0',
  },
  'messaging.client.id': {
    name: 'messaging.client.id',
    description: 'A unique identifier for the client that consumes or produces a message.',
    type: 'keyword',
    example: 'client-5',
  },
  'messaging.consumer.group.name': {
    name: 'messaging.consumer.group.name',
    description: 'The name of the consumer group with which a consumer is associated.',
    type: 'keyword',
    example: 'my-group',
  },
  'messaging.destination.name': {
    name: 'messaging.destination.name',
    description: 'The message destination name',
    type: 'keyword',
    example: 'MyQueue',
  },
  'messaging.destination.subscription.name': {
    name: 'messaging.destination.subscription.name',
    description: 'The name of the destination subscription from which a message is consumed.',
    type: 'keyword',
    example: 'subscription-a',
  },
  'messaging.destination.template': {
    name: 'messaging.destination.template',
    description: 'Low cardinality representation of the messaging destination name',
    type: 'keyword',
    example: '/customers/{customerId}',
  },
  'messaging.destination.anonymous': {
    name: 'messaging.destination.anonymous',
    description:
      'A boolean that is true if the message destination is anonymous (could be unnamed or have auto-generated name).',
    type: 'boolean',
  },
  'messaging.destination.temporary': {
    name: 'messaging.destination.temporary',
    description:
      'A boolean that is true if the message destination is temporary and might not exist anymore after messages are processed.',
    type: 'boolean',
  },
  'messaging.destination.partition.id': {
    name: 'messaging.destination.partition.id',
    description:
      'The identifier of the partition messages are sent to or received from, unique within the `messaging.destination.name`.',
    type: 'keyword',
    example: '1',
  },
  'messaging.message.conversation_id': {
    name: 'messaging.message.conversation_id',
    description:
      'The conversation ID identifying the conversation to which the message belongs, represented as a string. Sometimes called "Correlation ID".',
    type: 'keyword',
    example: 'M',
  },
  'messaging.message.envelope.size': {
    name: 'messaging.message.envelope.size',
    description: 'The size of the message body and metadata in bytes.',
    type: 'long',
  },
  'messaging.message.id': {
    name: 'messaging.message.id',
    description:
      'A value used by the messaging system as an identifier for the message, represented as a string.',
    type: 'keyword',
    example: '4',
  },
  'messaging.message.body.size': {
    name: 'messaging.message.body.size',
    description: 'The size of the message body in bytes.',
    type: 'long',
  },
  'messaging.operation.type': {
    name: 'messaging.operation.type',
    description: 'A string identifying the type of the messaging operation.',
    type: 'keyword',
  },
  'messaging.operation.name': {
    name: 'messaging.operation.name',
    description: 'The system-specific name of the messaging operation.',
    type: 'keyword',
    example: 'receive',
  },
  'messaging.system': {
    name: 'messaging.system',
    description: 'The messaging system as identified by the client instrumentation.',
    type: 'keyword',
  },
  'messaging.kafka.message.key': {
    name: 'messaging.kafka.message.key',
    description:
      "Message keys in Kafka are used for grouping alike messages to ensure they're processed on the same partition. They differ from `messaging.message.id` in that they're not unique. If the key is `null`, the attribute MUST NOT be set.",
    type: 'keyword',
    example: 'm',
  },
  'messaging.kafka.offset': {
    name: 'messaging.kafka.offset',
    description: 'The offset of a record in the corresponding Kafka partition.',
    type: 'long',
  },
  'messaging.kafka.message.tombstone': {
    name: 'messaging.kafka.message.tombstone',
    description: 'A boolean that is true if the message is a tombstone.',
    type: 'boolean',
  },
  'messaging.rabbitmq.destination.routing_key': {
    name: 'messaging.rabbitmq.destination.routing_key',
    description: 'RabbitMQ message routing key.',
    type: 'keyword',
    example: 'm',
  },
  'messaging.rabbitmq.message.delivery_tag': {
    name: 'messaging.rabbitmq.message.delivery_tag',
    description: 'RabbitMQ message delivery tag',
    type: 'long',
  },
  'messaging.rocketmq.consumption_model': {
    name: 'messaging.rocketmq.consumption_model',
    description: 'Model of message consumption. This only applies to consumer spans.',
    type: 'keyword',
  },
  'messaging.rocketmq.message.delay_time_level': {
    name: 'messaging.rocketmq.message.delay_time_level',
    description: 'The delay time level for delay message, which determines the message delay time.',
    type: 'long',
  },
  'messaging.rocketmq.message.delivery_timestamp': {
    name: 'messaging.rocketmq.message.delivery_timestamp',
    description:
      'The timestamp in milliseconds that the delay message is expected to be delivered to consumer.',
    type: 'long',
  },
  'messaging.rocketmq.message.group': {
    name: 'messaging.rocketmq.message.group',
    description:
      'It is essential for FIFO message. Messages that belong to the same message group are always processed one by one within the same consumer group.',
    type: 'keyword',
    example: 'm',
  },
  'messaging.rocketmq.message.keys': {
    name: 'messaging.rocketmq.message.keys',
    description: 'Key(s) of message, another way to mark message besides message id.',
    type: 'keyword',
    example: 'keyA,keyB',
  },
  'messaging.rocketmq.message.tag': {
    name: 'messaging.rocketmq.message.tag',
    description: 'The secondary classifier of message besides topic.',
    type: 'keyword',
    example: 't',
  },
  'messaging.rocketmq.message.type': {
    name: 'messaging.rocketmq.message.type',
    description: 'Type of message.',
    type: 'keyword',
  },
  'messaging.rocketmq.namespace': {
    name: 'messaging.rocketmq.namespace',
    description:
      'Namespace of RocketMQ resources, resources in different namespaces are individual.',
    type: 'keyword',
    example: 'm',
  },
  'messaging.gcp_pubsub.message.ordering_key': {
    name: 'messaging.gcp_pubsub.message.ordering_key',
    description:
      'The ordering key for a given message. If the attribute is not present, the message does not have an ordering key.',
    type: 'keyword',
    example: 'o',
  },
  'messaging.gcp_pubsub.message.ack_id': {
    name: 'messaging.gcp_pubsub.message.ack_id',
    description: 'The ack id for a given message.',
    type: 'keyword',
    example: 'a',
  },
  'messaging.gcp_pubsub.message.ack_deadline': {
    name: 'messaging.gcp_pubsub.message.ack_deadline',
    description: 'The ack deadline in seconds set for the modify ack deadline request.',
    type: 'long',
  },
  'messaging.gcp_pubsub.message.delivery_attempt': {
    name: 'messaging.gcp_pubsub.message.delivery_attempt',
    description: 'The delivery attempt for a given message.',
    type: 'long',
  },
  'messaging.servicebus.message.delivery_count': {
    name: 'messaging.servicebus.message.delivery_count',
    description: 'Number of deliveries that have been attempted for this message.',
    type: 'long',
  },
  'messaging.servicebus.message.enqueued_time': {
    name: 'messaging.servicebus.message.enqueued_time',
    description:
      'The UTC epoch seconds at which the message has been accepted and stored in the entity.',
    type: 'long',
  },
  'messaging.servicebus.disposition_status': {
    name: 'messaging.servicebus.disposition_status',
    description:
      'Describes the [settlement type](https://learn.microsoft.com/azure/service-bus-messaging/message-transfers-locks-settlement#peeklock).',
    type: 'keyword',
  },
  'messaging.eventhubs.message.enqueued_time': {
    name: 'messaging.eventhubs.message.enqueued_time',
    description:
      'The UTC epoch seconds at which the message has been accepted and stored in the entity.',
    type: 'long',
  },
  'http.request.body.size': {
    name: 'http.request.body.size',
    description:
      'The size of the request payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.',
    type: 'long',
  },
  'http.request.header': {
    name: 'http.request.header',
    description:
      'HTTP request headers, `<key>` being the normalized HTTP Header name (lowercase), the value being the header values.',
    type: 'keyword',
    example: 'application/json',
  },
  'http.request.method': {
    name: 'http.request.method',
    description: 'HTTP request method.',
    type: 'keyword',
    example: 'GET',
  },
  'http.request.method_original': {
    name: 'http.request.method_original',
    description: 'Original HTTP method sent by the client in the request line.',
    type: 'keyword',
    example: 'GeT',
  },
  'http.request.resend_count': {
    name: 'http.request.resend_count',
    description:
      'The ordinal number of request resending attempt (for any reason, including redirects).',
    type: 'long',
  },
  'http.request.size': {
    name: 'http.request.size',
    description:
      'The total size of the request in bytes. This should be the total number of bytes sent over the wire, including the request line (HTTP/1.1), framing (HTTP/2 and HTTP/3), headers, and request body if any.',
    type: 'long',
  },
  'http.response.body.size': {
    name: 'http.response.body.size',
    description:
      'The size of the response payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.',
    type: 'long',
  },
  'http.response.header': {
    name: 'http.response.header',
    description:
      'HTTP response headers, `<key>` being the normalized HTTP Header name (lowercase), the value being the header values.',
    type: 'keyword',
    example: 'application/json',
  },
  'http.response.size': {
    name: 'http.response.size',
    description:
      'The total size of the response in bytes. This should be the total number of bytes sent over the wire, including the status line (HTTP/1.1), framing (HTTP/2 and HTTP/3), headers, and response body and trailers if any.',
    type: 'long',
  },
  'http.response.status_code': {
    name: 'http.response.status_code',
    description: '[HTTP response status code](https://tools.ietf.org/html/rfc7231#section-6).',
    type: 'long',
    example: '200',
  },
  'http.route': {
    name: 'http.route',
    description:
      'The matched route, that is, the path template in the format used by the respective server framework.',
    type: 'keyword',
    example: '/users/:userID?',
  },
  'http.connection.state': {
    name: 'http.connection.state',
    description: 'State of the HTTP connection in the HTTP connection pool.',
    type: 'keyword',
    example: 'active',
  },
  'container.name': {
    name: 'container.name',
    description: 'Container name used by container runtime.',
    type: 'keyword',
    example: 'opentelemetry-autoconf',
  },
  'container.id': {
    name: 'container.id',
    description:
      'Container ID. Usually a UUID, as for example used to [identify Docker containers](https://docs.docker.com/engine/containers/run/#container-identification). The UUID might be abbreviated.',
    type: 'keyword',
    example: 'a3bf90e006b2',
  },
  'container.runtime.name': {
    name: 'container.runtime.name',
    description: 'The container runtime managing this container.',
    type: 'keyword',
    example: 'docker',
  },
  'container.runtime.version': {
    name: 'container.runtime.version',
    description:
      'The version of the runtime of this process, as returned by the runtime without modification.',
    type: 'keyword',
    example: '1',
  },
  'container.runtime.description': {
    name: 'container.runtime.description',
    description:
      'A description about the runtime which could include, for example details about the CRI/API version being used or other customisations.',
    type: 'keyword',
    example: 'docker://19.3.1 - CRI: 1.22.0',
  },
  'container.image.name': {
    name: 'container.image.name',
    description: 'Name of the image the container was built on.',
    type: 'keyword',
    example: 'gcr.io/opentelemetry/operator',
  },
  'container.image.tags': {
    name: 'container.image.tags',
    description:
      'Container image tags. An example can be found in [Docker Image Inspect](https://docs.docker.com/engine/api/v1.43/#tag/Image/operation/ImageInspect). Should be only the `<tag>` section of the full name for example from `registry.example.com/my-org/my-image:<tag>`.',
    type: 'keyword',
    example: 'v1.27.1,3.5.7-0',
  },
  'container.image.id': {
    name: 'container.image.id',
    description: 'Runtime specific image identifier. Usually a hash algorithm followed by a UUID.',
    type: 'keyword',
    example: 'sha256:19c92d0a00d1b66d897bceaa7319bee0dd38a10a851c60bcec9474aa3f01e50f',
  },
  'container.image.repo_digests': {
    name: 'container.image.repo_digests',
    description: 'Repo digests of the container image as provided by the container runtime.',
    type: 'keyword',
    example:
      'example@sha256:afcc7f1ac1b49db317a7196c902e61c6c3c4607d63599ee1a82d702d249a0ccb,internal.registry.example.com:5000/example@sha256:b69959407d21e8a062e0416bf13405bb2b71ed7a84dde4158ebafacfa06f5578',
  },
  'container.command': {
    name: 'container.command',
    description: 'The command used to run the container (i.e. the command name).',
    type: 'keyword',
    example: 'otelcontribcol',
  },
  'container.command_line': {
    name: 'container.command_line',
    description:
      'The full command run by the container as a single string representing the full command.',
    type: 'keyword',
    example: 'otelcontribcol --config config.yaml',
  },
  'container.command_args': {
    name: 'container.command_args',
    description:
      'All the command arguments (including the command/executable itself) run by the container.',
    type: 'keyword',
    example: 'otelcontribcol,--config,config.yaml',
  },
  'container.label': {
    name: 'container.label',
    description: 'Container labels, `<key>` being the label name, the value being the label value.',
    type: 'keyword',
    example: 'nginx',
  },
  'container.csi.plugin.name': {
    name: 'container.csi.plugin.name',
    description:
      'The name of the CSI ([Container Storage Interface](https://github.com/container-storage-interface/spec)) plugin used by the volume.',
    type: 'keyword',
    example: 'pd.csi.storage.gke.io',
  },
  'container.csi.volume.id': {
    name: 'container.csi.volume.id',
    description:
      'The unique volume ID returned by the CSI ([Container Storage Interface](https://github.com/container-storage-interface/spec)) plugin.',
    type: 'keyword',
    example: 'projects/my-gcp-project/zones/my-gcp-zone/disks/my-gcp-disk',
  },
  'security_rule.category': {
    name: 'security_rule.category',
    description:
      'A categorization value keyword used by the entity using the rule for detection of this event',
    type: 'keyword',
    example: 'Attempted Information Leak',
  },
  'security_rule.description': {
    name: 'security_rule.description',
    description: 'The description of the rule generating the event.',
    type: 'keyword',
    example: 'Block requests to public DNS over HTTPS / TLS protocols',
  },
  'security_rule.license': {
    name: 'security_rule.license',
    description:
      'Name of the license under which the rule used to generate this event is made available.',
    type: 'keyword',
    example: 'Apache 2.0',
  },
  'security_rule.name': {
    name: 'security_rule.name',
    description: 'The name of the rule or signature generating the event.',
    type: 'keyword',
    example: 'BLOCK_DNS_over_TLS',
  },
  'security_rule.reference': {
    name: 'security_rule.reference',
    description:
      'Reference URL to additional information about the rule used to generate this event.',
    type: 'keyword',
    example: 'https://en.wikipedia.org/wiki/DNS_over_TLS',
  },
  'security_rule.ruleset.name': {
    name: 'security_rule.ruleset.name',
    description:
      'Name of the ruleset, policy, group, or parent category in which the rule used to generate this event is a member.',
    type: 'keyword',
    example: 'Standard_Protocol_Filters',
  },
  'security_rule.uuid': {
    name: 'security_rule.uuid',
    description:
      'A rule ID that is unique within the scope of a set or group of agents, observers, or other entities using the rule for detection of this event.',
    type: 'keyword',
    example: '550e8400-e29b-41d4-a716-446655440000',
  },
  'security_rule.version': {
    name: 'security_rule.version',
    description: 'The version / revision of the rule being used for analysis.',
    type: 'keyword',
    example: '1.0.0',
  },
  'nodejs.eventloop.state': {
    name: 'nodejs.eventloop.state',
    description: 'The state of event loop time.',
    type: 'keyword',
  },
  'deployment.name': {
    name: 'deployment.name',
    description: 'The name of the deployment.',
    type: 'keyword',
    example: 'deploy my app',
  },
  'deployment.id': {
    name: 'deployment.id',
    description: 'The id of the deployment.',
    type: 'keyword',
    example: '1208',
  },
  'deployment.status': {
    name: 'deployment.status',
    description: 'The status of the deployment.',
    type: 'keyword',
  },
  'deployment.environment.name': {
    name: 'deployment.environment.name',
    description:
      'Name of the [deployment environment](https://wikipedia.org/wiki/Deployment_environment) (aka deployment tier).',
    type: 'keyword',
    example: 'staging',
  },
  'metrics.otel.sdk.span.live': {
    name: 'metrics.otel.sdk.span.live',
    description:
      'The number of created spans with `recording=true` for which the end operation has not been called yet.',
    type: 'double',
  },
  'metrics.otel.sdk.span.started': {
    name: 'metrics.otel.sdk.span.started',
    description: 'The number of created spans.',
    type: 'double',
  },
  'metrics.otel.sdk.processor.span.queue.size': {
    name: 'metrics.otel.sdk.processor.span.queue.size',
    description: 'The number of spans in the queue of a given instance of an SDK span processor.',
    type: 'double',
  },
  'metrics.otel.sdk.processor.span.queue.capacity': {
    name: 'metrics.otel.sdk.processor.span.queue.capacity',
    description:
      'The maximum number of spans the queue of a given instance of an SDK span processor can hold.',
    type: 'double',
  },
  'metrics.otel.sdk.processor.span.processed': {
    name: 'metrics.otel.sdk.processor.span.processed',
    description:
      'The number of spans for which the processing has finished, either successful or failed.',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.span.inflight': {
    name: 'metrics.otel.sdk.exporter.span.inflight',
    description:
      'The number of spans which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.span.exported': {
    name: 'metrics.otel.sdk.exporter.span.exported',
    description:
      'The number of spans for which the export has finished, either successful or failed.',
    type: 'double',
  },
  'metrics.otel.sdk.log.created': {
    name: 'metrics.otel.sdk.log.created',
    description: 'The number of logs submitted to enabled SDK Loggers.',
    type: 'double',
  },
  'metrics.otel.sdk.processor.log.queue.size': {
    name: 'metrics.otel.sdk.processor.log.queue.size',
    description:
      'The number of log records in the queue of a given instance of an SDK log processor.',
    type: 'double',
  },
  'metrics.otel.sdk.processor.log.queue.capacity': {
    name: 'metrics.otel.sdk.processor.log.queue.capacity',
    description:
      'The maximum number of log records the queue of a given instance of an SDK Log Record processor can hold.',
    type: 'double',
  },
  'metrics.otel.sdk.processor.log.processed': {
    name: 'metrics.otel.sdk.processor.log.processed',
    description:
      'The number of log records for which the processing has finished, either successful or failed.',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.log.inflight': {
    name: 'metrics.otel.sdk.exporter.log.inflight',
    description:
      'The number of log records which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.log.exported': {
    name: 'metrics.otel.sdk.exporter.log.exported',
    description:
      'The number of log records for which the export has finished, either successful or failed.',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.metric_data_point.inflight': {
    name: 'metrics.otel.sdk.exporter.metric_data_point.inflight',
    description:
      'The number of metric data points which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.metric_data_point.exported': {
    name: 'metrics.otel.sdk.exporter.metric_data_point.exported',
    description:
      'The number of metric data points for which the export has finished, either successful or failed.',
    type: 'double',
  },
  'metrics.otel.sdk.metric_reader.collection.duration': {
    name: 'metrics.otel.sdk.metric_reader.collection.duration',
    description: 'The duration of the collect operation of the metric reader.',
    type: 'double',
  },
  'metrics.otel.sdk.exporter.operation.duration': {
    name: 'metrics.otel.sdk.exporter.operation.duration',
    description: 'The duration of exporting a batch of telemetry records.',
    type: 'double',
  },
  'metrics.hw.logical_disk.limit': {
    name: 'metrics.hw.logical_disk.limit',
    description: 'Size of the logical disk.',
    type: 'double',
  },
  'metrics.hw.logical_disk.usage': {
    name: 'metrics.hw.logical_disk.usage',
    description: 'Logical disk space usage.',
    type: 'double',
  },
  'metrics.hw.logical_disk.utilization': {
    name: 'metrics.hw.logical_disk.utilization',
    description: 'Logical disk space utilization as a fraction.',
    type: 'double',
  },
  'metrics.hw.memory.size': {
    name: 'metrics.hw.memory.size',
    description: 'Size of the memory module.',
    type: 'double',
  },
  'metrics.hw.physical_disk.endurance_utilization': {
    name: 'metrics.hw.physical_disk.endurance_utilization',
    description: 'Endurance remaining for this SSD disk.',
    type: 'double',
  },
  'metrics.hw.physical_disk.size': {
    name: 'metrics.hw.physical_disk.size',
    description: 'Size of the disk.',
    type: 'double',
  },
  'metrics.hw.physical_disk.smart': {
    name: 'metrics.hw.physical_disk.smart',
    description:
      'Value of the corresponding [S.M.A.R.T.](https://wikipedia.org/wiki/S.M.A.R.T.) (Self-Monitoring, Analysis, and Reporting Technology) attribute.',
    type: 'double',
  },
  'metrics.hw.cpu.speed': {
    name: 'metrics.hw.cpu.speed',
    description: 'CPU current frequency.',
    type: 'double',
  },
  'metrics.hw.cpu.speed.limit': {
    name: 'metrics.hw.cpu.speed.limit',
    description: 'CPU maximum frequency.',
    type: 'double',
  },
  'metrics.hw.fan.speed': {
    name: 'metrics.hw.fan.speed',
    description: 'Fan speed in revolutions per minute.',
    type: 'double',
  },
  'metrics.hw.fan.speed.limit': {
    name: 'metrics.hw.fan.speed.limit',
    description: 'Speed limit in rpm.',
    type: 'double',
  },
  'metrics.hw.fan.speed_ratio': {
    name: 'metrics.hw.fan.speed_ratio',
    description: 'Fan speed expressed as a fraction of its maximum speed.',
    type: 'double',
  },
  'metrics.hw.temperature': {
    name: 'metrics.hw.temperature',
    description: 'Temperature in degrees Celsius.',
    type: 'double',
  },
  'metrics.hw.temperature.limit': {
    name: 'metrics.hw.temperature.limit',
    description: 'Temperature limit in degrees Celsius.',
    type: 'double',
  },
  'metrics.hw.host.ambient_temperature': {
    name: 'metrics.hw.host.ambient_temperature',
    description: 'Ambient (external) temperature of the physical host.',
    type: 'double',
  },
  'metrics.hw.host.energy': {
    name: 'metrics.hw.host.energy',
    description: 'Total energy consumed by the entire physical host, in joules.',
    type: 'double',
  },
  'metrics.hw.host.heating_margin': {
    name: 'metrics.hw.host.heating_margin',
    description:
      'By how many degrees Celsius the temperature of the physical host can be increased, before reaching a warning threshold on one of the internal sensors.',
    type: 'double',
  },
  'metrics.hw.host.power': {
    name: 'metrics.hw.host.power',
    description:
      'Instantaneous power consumed by the entire physical host in Watts (`hw.host.energy` is preferred).',
    type: 'double',
  },
  'metrics.hw.tape_drive.operations': {
    name: 'metrics.hw.tape_drive.operations',
    description: 'Operations performed by the tape drive.',
    type: 'double',
  },
  'metrics.hw.voltage': {
    name: 'metrics.hw.voltage',
    description: 'Voltage measured by the sensor.',
    type: 'double',
  },
  'metrics.hw.voltage.limit': {
    name: 'metrics.hw.voltage.limit',
    description: 'Voltage limit in Volts.',
    type: 'double',
  },
  'metrics.hw.voltage.nominal': {
    name: 'metrics.hw.voltage.nominal',
    description: 'Nominal (expected) voltage.',
    type: 'double',
  },
  'metrics.hw.gpu.io': {
    name: 'metrics.hw.gpu.io',
    description: 'Received and transmitted bytes by the GPU.',
    type: 'double',
  },
  'metrics.hw.gpu.memory.limit': {
    name: 'metrics.hw.gpu.memory.limit',
    description: 'Size of the GPU memory.',
    type: 'double',
  },
  'metrics.hw.gpu.memory.utilization': {
    name: 'metrics.hw.gpu.memory.utilization',
    description: 'Fraction of GPU memory used.',
    type: 'double',
  },
  'metrics.hw.gpu.memory.usage': {
    name: 'metrics.hw.gpu.memory.usage',
    description: 'GPU memory used.',
    type: 'double',
  },
  'metrics.hw.gpu.utilization': {
    name: 'metrics.hw.gpu.utilization',
    description: 'Fraction of time spent in a specific task.',
    type: 'double',
  },
  'metrics.hw.battery.charge': {
    name: 'metrics.hw.battery.charge',
    description: 'Remaining fraction of battery charge.',
    type: 'double',
  },
  'metrics.hw.battery.charge.limit': {
    name: 'metrics.hw.battery.charge.limit',
    description: 'Lower limit of battery charge fraction to ensure proper operation.',
    type: 'double',
  },
  'metrics.hw.battery.time_left': {
    name: 'metrics.hw.battery.time_left',
    description: 'Time left before battery is completely charged or discharged.',
    type: 'double',
  },
  'metrics.faas.invoke_duration': {
    name: 'metrics.faas.invoke_duration',
    description: "Measures the duration of the function's logic execution.",
    type: 'double',
  },
  'metrics.faas.init_duration': {
    name: 'metrics.faas.init_duration',
    description: "Measures the duration of the function's initialization, such as a cold start.",
    type: 'double',
  },
  'metrics.faas.coldstarts': {
    name: 'metrics.faas.coldstarts',
    description: 'Number of invocation cold starts.',
    type: 'double',
  },
  'metrics.faas.errors': {
    name: 'metrics.faas.errors',
    description: 'Number of invocation errors.',
    type: 'double',
  },
  'metrics.faas.invocations': {
    name: 'metrics.faas.invocations',
    description: 'Number of successful invocations.',
    type: 'double',
  },
  'metrics.faas.timeouts': {
    name: 'metrics.faas.timeouts',
    description: 'Number of invocation timeouts.',
    type: 'double',
  },
  'metrics.faas.mem_usage': {
    name: 'metrics.faas.mem_usage',
    description: 'Distribution of max memory usage per invocation.',
    type: 'double',
  },
  'metrics.faas.cpu_usage': {
    name: 'metrics.faas.cpu_usage',
    description: 'Distribution of CPU usage per invocation.',
    type: 'double',
  },
  'metrics.faas.net_io': {
    name: 'metrics.faas.net_io',
    description: 'Distribution of net I/O usage per invocation.',
    type: 'double',
  },
  'metrics.process.cpu.time': {
    name: 'metrics.process.cpu.time',
    description: 'Total CPU seconds broken down by different states.',
    type: 'double',
  },
  'metrics.process.cpu.utilization': {
    name: 'metrics.process.cpu.utilization',
    description:
      'Difference in process.cpu.time since the last measurement, divided by the elapsed time and number of CPUs available to the process.',
    type: 'double',
  },
  'metrics.process.memory.usage': {
    name: 'metrics.process.memory.usage',
    description: 'The amount of physical memory in use.',
    type: 'double',
  },
  'metrics.process.memory.virtual': {
    name: 'metrics.process.memory.virtual',
    description: 'The amount of committed virtual memory.',
    type: 'double',
  },
  'metrics.process.disk.io': {
    name: 'metrics.process.disk.io',
    description: 'Disk bytes transferred.',
    type: 'double',
  },
  'metrics.process.network.io': {
    name: 'metrics.process.network.io',
    description: 'Network bytes transferred.',
    type: 'double',
  },
  'metrics.process.thread.count': {
    name: 'metrics.process.thread.count',
    description: 'Process threads count.',
    type: 'double',
  },
  'metrics.process.open_file_descriptor.count': {
    name: 'metrics.process.open_file_descriptor.count',
    description: 'Number of file descriptors in use by the process.',
    type: 'double',
  },
  'metrics.process.context_switches': {
    name: 'metrics.process.context_switches',
    description: 'Number of times the process has been context switched.',
    type: 'double',
  },
  'metrics.process.paging.faults': {
    name: 'metrics.process.paging.faults',
    description: 'Number of page faults the process has made.',
    type: 'double',
  },
  'metrics.process.uptime': {
    name: 'metrics.process.uptime',
    description: 'The time the process has been running.',
    type: 'double',
  },
  'metrics.gen_ai.client.token.usage': {
    name: 'metrics.gen_ai.client.token.usage',
    description: 'Number of input and output tokens used.',
    type: 'double',
  },
  'metrics.gen_ai.client.operation.duration': {
    name: 'metrics.gen_ai.client.operation.duration',
    description: 'GenAI operation duration.',
    type: 'double',
  },
  'metrics.gen_ai.server.request.duration': {
    name: 'metrics.gen_ai.server.request.duration',
    description:
      'Generative AI server request duration such as time-to-last byte or last output token.',
    type: 'double',
  },
  'metrics.gen_ai.server.time_per_output_token': {
    name: 'metrics.gen_ai.server.time_per_output_token',
    description: 'Time per output token generated after the first token for successful responses.',
    type: 'double',
  },
  'metrics.gen_ai.server.time_to_first_token': {
    name: 'metrics.gen_ai.server.time_to_first_token',
    description: 'Time to generate first token for successful responses.',
    type: 'double',
  },
  'metrics.jvm.memory.init': {
    name: 'metrics.jvm.memory.init',
    description: 'Measure of initial memory requested.',
    type: 'double',
  },
  'metrics.jvm.system.cpu.utilization': {
    name: 'metrics.jvm.system.cpu.utilization',
    description: 'Recent CPU utilization for the whole system as reported by the JVM.',
    type: 'double',
  },
  'metrics.jvm.system.cpu.load_1m': {
    name: 'metrics.jvm.system.cpu.load_1m',
    description: 'Average CPU load of the whole system for the last minute as reported by the JVM.',
    type: 'double',
  },
  'metrics.jvm.buffer.memory.used': {
    name: 'metrics.jvm.buffer.memory.used',
    description: 'Measure of memory used by buffers.',
    type: 'double',
  },
  'metrics.jvm.buffer.memory.limit': {
    name: 'metrics.jvm.buffer.memory.limit',
    description: 'Measure of total memory capacity of buffers.',
    type: 'double',
  },
  'metrics.jvm.buffer.count': {
    name: 'metrics.jvm.buffer.count',
    description: 'Number of buffers in the pool.',
    type: 'double',
  },
  'metrics.jvm.file_descriptor.count': {
    name: 'metrics.jvm.file_descriptor.count',
    description: 'Number of open file descriptors as reported by the JVM.',
    type: 'double',
  },
  'metrics.kestrel.active_connections': {
    name: 'metrics.kestrel.active_connections',
    description: 'Number of connections that are currently active on the server.',
    type: 'double',
  },
  'metrics.kestrel.connection.duration': {
    name: 'metrics.kestrel.connection.duration',
    description: 'The duration of connections on the server.',
    type: 'double',
  },
  'metrics.kestrel.rejected_connections': {
    name: 'metrics.kestrel.rejected_connections',
    description: 'Number of connections rejected by the server.',
    type: 'double',
  },
  'metrics.kestrel.queued_connections': {
    name: 'metrics.kestrel.queued_connections',
    description: 'Number of connections that are currently queued and are waiting to start.',
    type: 'double',
  },
  'metrics.kestrel.queued_requests': {
    name: 'metrics.kestrel.queued_requests',
    description:
      'Number of HTTP requests on multiplexed connections (HTTP/2 and HTTP/3) that are currently queued and are waiting to start.',
    type: 'double',
  },
  'metrics.kestrel.upgraded_connections': {
    name: 'metrics.kestrel.upgraded_connections',
    description: 'Number of connections that are currently upgraded (WebSockets). .',
    type: 'double',
  },
  'metrics.kestrel.tls_handshake.duration': {
    name: 'metrics.kestrel.tls_handshake.duration',
    description: 'The duration of TLS handshakes on the server.',
    type: 'double',
  },
  'metrics.kestrel.active_tls_handshakes': {
    name: 'metrics.kestrel.active_tls_handshakes',
    description: 'Number of TLS handshakes that are currently in progress on the server.',
    type: 'double',
  },
  'metrics.v8js.gc.duration': {
    name: 'metrics.v8js.gc.duration',
    description: 'Garbage collection duration.',
    type: 'double',
  },
  'metrics.v8js.memory.heap.limit': {
    name: 'metrics.v8js.memory.heap.limit',
    description: 'Total heap memory size pre-allocated.',
    type: 'double',
  },
  'metrics.v8js.memory.heap.used': {
    name: 'metrics.v8js.memory.heap.used',
    description: 'Heap Memory size allocated.',
    type: 'double',
  },
  'metrics.v8js.heap.space.available_size': {
    name: 'metrics.v8js.heap.space.available_size',
    description: 'Heap space available size.',
    type: 'double',
  },
  'metrics.v8js.heap.space.physical_size': {
    name: 'metrics.v8js.heap.space.physical_size',
    description: 'Committed size of a heap space.',
    type: 'double',
  },
  'metrics.vcs.change.count': {
    name: 'metrics.vcs.change.count',
    description:
      'The number of changes (pull requests/merge requests/changelists) in a repository, categorized by their state (e.g. open or merged).',
    type: 'double',
  },
  'metrics.vcs.change.duration': {
    name: 'metrics.vcs.change.duration',
    description:
      'The time duration a change (pull request/merge request/changelist) has been in a given state.',
    type: 'double',
  },
  'metrics.vcs.change.time_to_approval': {
    name: 'metrics.vcs.change.time_to_approval',
    description:
      'The amount of time since its creation it took a change (pull request/merge request/changelist) to get the first approval.',
    type: 'double',
  },
  'metrics.vcs.change.time_to_merge': {
    name: 'metrics.vcs.change.time_to_merge',
    description:
      'The amount of time since its creation it took a change (pull request/merge request/changelist) to get merged into the target(base) ref.',
    type: 'double',
  },
  'metrics.vcs.repository.count': {
    name: 'metrics.vcs.repository.count',
    description: 'The number of repositories in an organization.',
    type: 'double',
  },
  'metrics.vcs.ref.count': {
    name: 'metrics.vcs.ref.count',
    description: 'The number of refs of type branch or tag in a repository.',
    type: 'double',
  },
  'metrics.vcs.ref.lines_delta': {
    name: 'metrics.vcs.ref.lines_delta',
    description:
      'The number of lines added/removed in a ref (branch) relative to the ref from the `vcs.ref.base.name` attribute.',
    type: 'double',
  },
  'metrics.vcs.ref.revisions_delta': {
    name: 'metrics.vcs.ref.revisions_delta',
    description:
      'The number of revisions (commits) a ref (branch) is ahead/behind the branch from the `vcs.ref.base.name` attribute.',
    type: 'double',
  },
  'metrics.vcs.ref.time': {
    name: 'metrics.vcs.ref.time',
    description:
      'Time a ref (branch) created from the default branch (trunk) has existed. The `ref.type` attribute will always be `branch`.',
    type: 'double',
  },
  'metrics.vcs.contributor.count': {
    name: 'metrics.vcs.contributor.count',
    description: 'The number of unique contributors to a repository.',
    type: 'double',
  },
  'metrics.cpython.gc.collections': {
    name: 'metrics.cpython.gc.collections',
    description: 'The number of times a generation was collected since interpreter start.',
    type: 'double',
  },
  'metrics.cpython.gc.collected_objects': {
    name: 'metrics.cpython.gc.collected_objects',
    description:
      'The total number of objects collected inside a generation since interpreter start.',
    type: 'double',
  },
  'metrics.cpython.gc.uncollectable_objects': {
    name: 'metrics.cpython.gc.uncollectable_objects',
    description:
      'The total number of objects which were found to be uncollectable inside a generation since interpreter start.',
    type: 'double',
  },
  'metrics.azure.cosmosdb.client.operation.request_charge': {
    name: 'metrics.azure.cosmosdb.client.operation.request_charge',
    description:
      '[Request units](https://learn.microsoft.com/azure/cosmos-db/request-units) consumed by the operation.',
    type: 'double',
  },
  'metrics.azure.cosmosdb.client.active_instance.count': {
    name: 'metrics.azure.cosmosdb.client.active_instance.count',
    description: 'Number of active client instances.',
    type: 'double',
  },
  'metrics.dns.lookup.duration': {
    name: 'metrics.dns.lookup.duration',
    description: 'Measures the time taken to perform a DNS lookup.',
    type: 'double',
  },
  'metrics.k8s.pod.uptime': {
    name: 'metrics.k8s.pod.uptime',
    description: 'The time the Pod has been running.',
    type: 'double',
  },
  'metrics.k8s.pod.cpu.time': {
    name: 'metrics.k8s.pod.cpu.time',
    description: 'Total CPU time consumed.',
    type: 'double',
  },
  'metrics.k8s.pod.cpu.usage': {
    name: 'metrics.k8s.pod.cpu.usage',
    description:
      "Pod's CPU usage, measured in cpus. Range from 0 to the number of allocatable CPUs.",
    type: 'double',
  },
  'metrics.k8s.pod.memory.usage': {
    name: 'metrics.k8s.pod.memory.usage',
    description: 'Memory usage of the Pod.',
    type: 'double',
  },
  'metrics.k8s.pod.network.io': {
    name: 'metrics.k8s.pod.network.io',
    description: 'Network bytes for the Pod.',
    type: 'double',
  },
  'metrics.k8s.pod.network.errors': {
    name: 'metrics.k8s.pod.network.errors',
    description: 'Pod network errors.',
    type: 'double',
  },
  'metrics.k8s.pod.filesystem.available': {
    name: 'metrics.k8s.pod.filesystem.available',
    description: 'Pod filesystem available bytes.',
    type: 'double',
  },
  'metrics.k8s.pod.filesystem.capacity': {
    name: 'metrics.k8s.pod.filesystem.capacity',
    description: 'Pod filesystem capacity.',
    type: 'double',
  },
  'metrics.k8s.pod.filesystem.usage': {
    name: 'metrics.k8s.pod.filesystem.usage',
    description: 'Pod filesystem usage.',
    type: 'double',
  },
  'metrics.k8s.pod.volume.available': {
    name: 'metrics.k8s.pod.volume.available',
    description: 'Pod volume storage space available.',
    type: 'double',
  },
  'metrics.k8s.pod.volume.capacity': {
    name: 'metrics.k8s.pod.volume.capacity',
    description: 'Pod volume total capacity.',
    type: 'double',
  },
  'metrics.k8s.pod.volume.usage': {
    name: 'metrics.k8s.pod.volume.usage',
    description: 'Pod volume usage.',
    type: 'double',
  },
  'metrics.k8s.pod.volume.inode.count': {
    name: 'metrics.k8s.pod.volume.inode.count',
    description: "The total inodes in the filesystem of the Pod's volume.",
    type: 'double',
  },
  'metrics.k8s.pod.volume.inode.used': {
    name: 'metrics.k8s.pod.volume.inode.used',
    description: "The inodes used by the filesystem of the Pod's volume.",
    type: 'double',
  },
  'metrics.k8s.pod.volume.inode.free': {
    name: 'metrics.k8s.pod.volume.inode.free',
    description: "The free inodes in the filesystem of the Pod's volume.",
    type: 'double',
  },
  'metrics.k8s.container.status.state': {
    name: 'metrics.k8s.container.status.state',
    description: 'Describes the number of K8s containers that are currently in a given state.',
    type: 'double',
  },
  'metrics.k8s.container.status.reason': {
    name: 'metrics.k8s.container.status.reason',
    description:
      'Describes the number of K8s containers that are currently in a state for a given reason.',
    type: 'double',
  },
  'metrics.k8s.node.uptime': {
    name: 'metrics.k8s.node.uptime',
    description: 'The time the Node has been running.',
    type: 'double',
  },
  'metrics.k8s.node.allocatable.cpu': {
    name: 'metrics.k8s.node.allocatable.cpu',
    description: 'Amount of cpu allocatable on the node.',
    type: 'double',
  },
  'metrics.k8s.node.allocatable.ephemeral_storage': {
    name: 'metrics.k8s.node.allocatable.ephemeral_storage',
    description: 'Amount of ephemeral-storage allocatable on the node.',
    type: 'double',
  },
  'metrics.k8s.node.allocatable.memory': {
    name: 'metrics.k8s.node.allocatable.memory',
    description: 'Amount of memory allocatable on the node.',
    type: 'double',
  },
  'metrics.k8s.node.allocatable.pods': {
    name: 'metrics.k8s.node.allocatable.pods',
    description: 'Amount of pods allocatable on the node.',
    type: 'double',
  },
  'metrics.k8s.node.condition.status': {
    name: 'metrics.k8s.node.condition.status',
    description: 'Describes the condition of a particular Node.',
    type: 'double',
  },
  'metrics.k8s.node.cpu.time': {
    name: 'metrics.k8s.node.cpu.time',
    description: 'Total CPU time consumed.',
    type: 'double',
  },
  'metrics.k8s.node.cpu.usage': {
    name: 'metrics.k8s.node.cpu.usage',
    description:
      "Node's CPU usage, measured in cpus. Range from 0 to the number of allocatable CPUs.",
    type: 'double',
  },
  'metrics.k8s.node.filesystem.available': {
    name: 'metrics.k8s.node.filesystem.available',
    description: 'Node filesystem available bytes.',
    type: 'double',
  },
  'metrics.k8s.node.filesystem.capacity': {
    name: 'metrics.k8s.node.filesystem.capacity',
    description: 'Node filesystem capacity.',
    type: 'double',
  },
  'metrics.k8s.node.filesystem.usage': {
    name: 'metrics.k8s.node.filesystem.usage',
    description: 'Node filesystem usage.',
    type: 'double',
  },
  'metrics.k8s.node.memory.usage': {
    name: 'metrics.k8s.node.memory.usage',
    description: 'Memory usage of the Node.',
    type: 'double',
  },
  'metrics.k8s.node.network.io': {
    name: 'metrics.k8s.node.network.io',
    description: 'Network bytes for the Node.',
    type: 'double',
  },
  'metrics.k8s.node.network.errors': {
    name: 'metrics.k8s.node.network.errors',
    description: 'Node network errors.',
    type: 'double',
  },
  'metrics.k8s.deployment.desired_pods': {
    name: 'metrics.k8s.deployment.desired_pods',
    description: 'Number of desired replica pods in this deployment.',
    type: 'double',
  },
  'metrics.k8s.deployment.available_pods': {
    name: 'metrics.k8s.deployment.available_pods',
    description:
      'Total number of available replica pods (ready for at least minReadySeconds) targeted by this deployment.',
    type: 'double',
  },
  'metrics.k8s.replicaset.desired_pods': {
    name: 'metrics.k8s.replicaset.desired_pods',
    description: 'Number of desired replica pods in this replicaset.',
    type: 'double',
  },
  'metrics.k8s.replicaset.available_pods': {
    name: 'metrics.k8s.replicaset.available_pods',
    description:
      'Total number of available replica pods (ready for at least minReadySeconds) targeted by this replicaset.',
    type: 'double',
  },
  'metrics.k8s.replicationcontroller.desired_pods': {
    name: 'metrics.k8s.replicationcontroller.desired_pods',
    description: 'Number of desired replica pods in this replication controller.',
    type: 'double',
  },
  'metrics.k8s.replicationcontroller.available_pods': {
    name: 'metrics.k8s.replicationcontroller.available_pods',
    description:
      'Total number of available replica pods (ready for at least minReadySeconds) targeted by this replication controller.',
    type: 'double',
  },
  'metrics.k8s.statefulset.desired_pods': {
    name: 'metrics.k8s.statefulset.desired_pods',
    description: 'Number of desired replica pods in this statefulset.',
    type: 'double',
  },
  'metrics.k8s.statefulset.ready_pods': {
    name: 'metrics.k8s.statefulset.ready_pods',
    description: 'The number of replica pods created for this statefulset with a Ready Condition.',
    type: 'double',
  },
  'metrics.k8s.statefulset.current_pods': {
    name: 'metrics.k8s.statefulset.current_pods',
    description:
      'The number of replica pods created by the statefulset controller from the statefulset version indicated by currentRevision.',
    type: 'double',
  },
  'metrics.k8s.statefulset.updated_pods': {
    name: 'metrics.k8s.statefulset.updated_pods',
    description:
      'Number of replica pods created by the statefulset controller from the statefulset version indicated by updateRevision.',
    type: 'double',
  },
  'metrics.k8s.hpa.desired_pods': {
    name: 'metrics.k8s.hpa.desired_pods',
    description:
      'Desired number of replica pods managed by this horizontal pod autoscaler, as last calculated by the autoscaler.',
    type: 'double',
  },
  'metrics.k8s.hpa.current_pods': {
    name: 'metrics.k8s.hpa.current_pods',
    description:
      'Current number of replica pods managed by this horizontal pod autoscaler, as last seen by the autoscaler.',
    type: 'double',
  },
  'metrics.k8s.hpa.max_pods': {
    name: 'metrics.k8s.hpa.max_pods',
    description:
      'The upper limit for the number of replica pods to which the autoscaler can scale up.',
    type: 'double',
  },
  'metrics.k8s.hpa.min_pods': {
    name: 'metrics.k8s.hpa.min_pods',
    description:
      'The lower limit for the number of replica pods to which the autoscaler can scale down.',
    type: 'double',
  },
  'metrics.k8s.hpa.metric.target.cpu.value': {
    name: 'metrics.k8s.hpa.metric.target.cpu.value',
    description: 'Target value for CPU resource in HPA config.',
    type: 'double',
  },
  'metrics.k8s.hpa.metric.target.cpu.average_value': {
    name: 'metrics.k8s.hpa.metric.target.cpu.average_value',
    description: 'Target average value for CPU resource in HPA config.',
    type: 'double',
  },
  'metrics.k8s.hpa.metric.target.cpu.average_utilization': {
    name: 'metrics.k8s.hpa.metric.target.cpu.average_utilization',
    description: 'Target average utilization, in percentage, for CPU resource in HPA config.',
    type: 'double',
  },
  'metrics.k8s.daemonset.current_scheduled_nodes': {
    name: 'metrics.k8s.daemonset.current_scheduled_nodes',
    description:
      'Number of nodes that are running at least 1 daemon pod and are supposed to run the daemon pod.',
    type: 'double',
  },
  'metrics.k8s.daemonset.desired_scheduled_nodes': {
    name: 'metrics.k8s.daemonset.desired_scheduled_nodes',
    description:
      'Number of nodes that should be running the daemon pod (including nodes currently running the daemon pod).',
    type: 'double',
  },
  'metrics.k8s.daemonset.misscheduled_nodes': {
    name: 'metrics.k8s.daemonset.misscheduled_nodes',
    description:
      'Number of nodes that are running the daemon pod, but are not supposed to run the daemon pod.',
    type: 'double',
  },
  'metrics.k8s.daemonset.ready_nodes': {
    name: 'metrics.k8s.daemonset.ready_nodes',
    description:
      'Number of nodes that should be running the daemon pod and have one or more of the daemon pod running and ready.',
    type: 'double',
  },
  'metrics.k8s.job.active_pods': {
    name: 'metrics.k8s.job.active_pods',
    description: 'The number of pending and actively running pods for a job.',
    type: 'double',
  },
  'metrics.k8s.job.failed_pods': {
    name: 'metrics.k8s.job.failed_pods',
    description: 'The number of pods which reached phase Failed for a job.',
    type: 'double',
  },
  'metrics.k8s.job.successful_pods': {
    name: 'metrics.k8s.job.successful_pods',
    description: 'The number of pods which reached phase Succeeded for a job.',
    type: 'double',
  },
  'metrics.k8s.job.desired_successful_pods': {
    name: 'metrics.k8s.job.desired_successful_pods',
    description: 'The desired number of successfully finished pods the job should be run with.',
    type: 'double',
  },
  'metrics.k8s.job.max_parallel_pods': {
    name: 'metrics.k8s.job.max_parallel_pods',
    description: 'The max desired number of pods the job should run at any given time.',
    type: 'double',
  },
  'metrics.k8s.cronjob.active_jobs': {
    name: 'metrics.k8s.cronjob.active_jobs',
    description: 'The number of actively running jobs for a cronjob.',
    type: 'double',
  },
  'metrics.k8s.namespace.phase': {
    name: 'metrics.k8s.namespace.phase',
    description: 'Describes number of K8s namespaces that are currently in a given phase.',
    type: 'double',
  },
  'metrics.k8s.container.cpu.limit': {
    name: 'metrics.k8s.container.cpu.limit',
    description: 'Maximum CPU resource limit set for the container.',
    type: 'double',
  },
  'metrics.k8s.container.cpu.request': {
    name: 'metrics.k8s.container.cpu.request',
    description: 'CPU resource requested for the container.',
    type: 'double',
  },
  'metrics.k8s.container.memory.limit': {
    name: 'metrics.k8s.container.memory.limit',
    description: 'Maximum memory resource limit set for the container.',
    type: 'double',
  },
  'metrics.k8s.container.memory.request': {
    name: 'metrics.k8s.container.memory.request',
    description: 'Memory resource requested for the container.',
    type: 'double',
  },
  'metrics.k8s.container.storage.limit': {
    name: 'metrics.k8s.container.storage.limit',
    description: 'Maximum storage resource limit set for the container.',
    type: 'double',
  },
  'metrics.k8s.container.storage.request': {
    name: 'metrics.k8s.container.storage.request',
    description: 'Storage resource requested for the container.',
    type: 'double',
  },
  'metrics.k8s.container.ephemeral_storage.limit': {
    name: 'metrics.k8s.container.ephemeral_storage.limit',
    description: 'Maximum ephemeral storage resource limit set for the container.',
    type: 'double',
  },
  'metrics.k8s.container.ephemeral_storage.request': {
    name: 'metrics.k8s.container.ephemeral_storage.request',
    description: 'Ephemeral storage resource requested for the container.',
    type: 'double',
  },
  'metrics.k8s.container.restart.count': {
    name: 'metrics.k8s.container.restart.count',
    description:
      'Describes how many times the container has restarted (since the last counter reset).',
    type: 'double',
  },
  'metrics.k8s.container.ready': {
    name: 'metrics.k8s.container.ready',
    description:
      'Indicates whether the container is currently marked as ready to accept traffic, based on its readiness probe (1 = ready, 0 = not ready).',
    type: 'double',
  },
  'metrics.k8s.resourcequota.cpu.limit.hard': {
    name: 'metrics.k8s.resourcequota.cpu.limit.hard',
    description:
      'The CPU limits in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.cpu.limit.used': {
    name: 'metrics.k8s.resourcequota.cpu.limit.used',
    description:
      'The CPU limits in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.cpu.request.hard': {
    name: 'metrics.k8s.resourcequota.cpu.request.hard',
    description:
      'The CPU requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.cpu.request.used': {
    name: 'metrics.k8s.resourcequota.cpu.request.used',
    description:
      'The CPU requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.memory.limit.hard': {
    name: 'metrics.k8s.resourcequota.memory.limit.hard',
    description:
      'The memory limits in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.memory.limit.used': {
    name: 'metrics.k8s.resourcequota.memory.limit.used',
    description:
      'The memory limits in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.memory.request.hard': {
    name: 'metrics.k8s.resourcequota.memory.request.hard',
    description:
      'The memory requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.memory.request.used': {
    name: 'metrics.k8s.resourcequota.memory.request.used',
    description:
      'The memory requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.hugepage_count.request.hard': {
    name: 'metrics.k8s.resourcequota.hugepage_count.request.hard',
    description:
      'The huge page requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.hugepage_count.request.used': {
    name: 'metrics.k8s.resourcequota.hugepage_count.request.used',
    description:
      'The huge page requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.storage.request.hard': {
    name: 'metrics.k8s.resourcequota.storage.request.hard',
    description:
      'The storage requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.storage.request.used': {
    name: 'metrics.k8s.resourcequota.storage.request.used',
    description:
      'The storage requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.persistentvolumeclaim_count.hard': {
    name: 'metrics.k8s.resourcequota.persistentvolumeclaim_count.hard',
    description:
      'The total number of PersistentVolumeClaims that can exist in the namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.persistentvolumeclaim_count.used': {
    name: 'metrics.k8s.resourcequota.persistentvolumeclaim_count.used',
    description:
      'The total number of PersistentVolumeClaims that can exist in the namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.ephemeral_storage.request.hard': {
    name: 'metrics.k8s.resourcequota.ephemeral_storage.request.hard',
    description:
      'The sum of local ephemeral storage requests in the namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.ephemeral_storage.request.used': {
    name: 'metrics.k8s.resourcequota.ephemeral_storage.request.used',
    description:
      'The sum of local ephemeral storage requests in the namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.ephemeral_storage.limit.hard': {
    name: 'metrics.k8s.resourcequota.ephemeral_storage.limit.hard',
    description:
      'The sum of local ephemeral storage limits in the namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.ephemeral_storage.limit.used': {
    name: 'metrics.k8s.resourcequota.ephemeral_storage.limit.used',
    description:
      'The sum of local ephemeral storage limits in the namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.object_count.hard': {
    name: 'metrics.k8s.resourcequota.object_count.hard',
    description:
      'The object count limits in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
    type: 'double',
  },
  'metrics.k8s.resourcequota.object_count.used': {
    name: 'metrics.k8s.resourcequota.object_count.used',
    description:
      'The object count limits in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
    type: 'double',
  },
  'metrics.messaging.attributes': {
    name: 'metrics.messaging.attributes',
    description: 'Common messaging metrics attributes.',
    type: 'double',
  },
  'metrics.messaging.consumer.attributes': {
    name: 'metrics.messaging.consumer.attributes',
    description: 'Messaging consumer metrics attributes.',
    type: 'double',
  },
  'metrics.messaging.client.operation.duration': {
    name: 'metrics.messaging.client.operation.duration',
    description: 'Duration of messaging operation initiated by a producer or consumer client.',
    type: 'double',
  },
  'metrics.messaging.process.duration': {
    name: 'metrics.messaging.process.duration',
    description: 'Duration of processing operation.',
    type: 'double',
  },
  'metrics.messaging.client.sent.messages': {
    name: 'metrics.messaging.client.sent.messages',
    description: 'Number of messages producer attempted to send to the broker.',
    type: 'double',
  },
  'metrics.messaging.client.consumed.messages': {
    name: 'metrics.messaging.client.consumed.messages',
    description: 'Number of messages that were delivered to the application.',
    type: 'double',
  },
  'metrics.container.uptime': {
    name: 'metrics.container.uptime',
    description: 'The time the container has been running.',
    type: 'double',
  },
  'metrics.container.cpu.time': {
    name: 'metrics.container.cpu.time',
    description: 'Total CPU time consumed.',
    type: 'double',
  },
  'metrics.container.cpu.usage': {
    name: 'metrics.container.cpu.usage',
    description:
      "Container's CPU usage, measured in cpus. Range from 0 to the number of allocatable CPUs.",
    type: 'double',
  },
  'metrics.container.memory.usage': {
    name: 'metrics.container.memory.usage',
    description: 'Memory usage of the container.',
    type: 'double',
  },
  'metrics.container.disk.io': {
    name: 'metrics.container.disk.io',
    description: 'Disk bytes for the container.',
    type: 'double',
  },
  'metrics.container.network.io': {
    name: 'metrics.container.network.io',
    description: 'Network bytes for the container.',
    type: 'double',
  },
  'metrics.container.filesystem.available': {
    name: 'metrics.container.filesystem.available',
    description: 'Container filesystem available bytes.',
    type: 'double',
  },
  'metrics.container.filesystem.capacity': {
    name: 'metrics.container.filesystem.capacity',
    description: 'Container filesystem capacity.',
    type: 'double',
  },
  'metrics.container.filesystem.usage': {
    name: 'metrics.container.filesystem.usage',
    description: 'Container filesystem usage.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.min': {
    name: 'metrics.nodejs.eventloop.delay.min',
    description: 'Event loop minimum delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.max': {
    name: 'metrics.nodejs.eventloop.delay.max',
    description: 'Event loop maximum delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.mean': {
    name: 'metrics.nodejs.eventloop.delay.mean',
    description: 'Event loop mean delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.stddev': {
    name: 'metrics.nodejs.eventloop.delay.stddev',
    description: 'Event loop standard deviation delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.p50': {
    name: 'metrics.nodejs.eventloop.delay.p50',
    description: 'Event loop 50 percentile delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.p90': {
    name: 'metrics.nodejs.eventloop.delay.p90',
    description: 'Event loop 90 percentile delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.delay.p99': {
    name: 'metrics.nodejs.eventloop.delay.p99',
    description: 'Event loop 99 percentile delay.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.utilization': {
    name: 'metrics.nodejs.eventloop.utilization',
    description: 'Event loop utilization.',
    type: 'double',
  },
  'metrics.nodejs.eventloop.time': {
    name: 'metrics.nodejs.eventloop.time',
    description: 'Cumulative duration of time the event loop has been in each state.',
    type: 'double',
  },
  'metrics.hw.network.bandwidth.limit': {
    name: 'metrics.hw.network.bandwidth.limit',
    description: 'Link speed.',
    type: 'double',
  },
  'metrics.hw.network.bandwidth.utilization': {
    name: 'metrics.hw.network.bandwidth.utilization',
    description: 'Utilization of the network bandwidth as a fraction.',
    type: 'double',
  },
  'metrics.hw.network.io': {
    name: 'metrics.hw.network.io',
    description: 'Received and transmitted network traffic in bytes.',
    type: 'double',
  },
  'metrics.hw.network.packets': {
    name: 'metrics.hw.network.packets',
    description: 'Received and transmitted network traffic in packets (or frames).',
    type: 'double',
  },
  'metrics.hw.network.up': {
    name: 'metrics.hw.network.up',
    description: 'Link status: `1` (up) or `0` (down).',
    type: 'double',
  },
  'metrics.hw.energy': {
    name: 'metrics.hw.energy',
    description: 'Energy consumed by the component.',
    type: 'double',
  },
  'metrics.hw.errors': {
    name: 'metrics.hw.errors',
    description: 'Number of errors encountered by the component.',
    type: 'double',
  },
  'metrics.hw.power': {
    name: 'metrics.hw.power',
    description: 'Instantaneous power consumed by the component.',
    type: 'double',
  },
  'metrics.hw.status': {
    name: 'metrics.hw.status',
    description: 'Operational status: `1` (true) or `0` (false) for each of the possible states.',
    type: 'double',
  },
  'metrics.hw.power_supply.limit': {
    name: 'metrics.hw.power_supply.limit',
    description: 'Maximum power output of the power supply.',
    type: 'double',
  },
  'metrics.hw.power_supply.utilization': {
    name: 'metrics.hw.power_supply.utilization',
    description: 'Utilization of the power supply as a fraction of its maximum output.',
    type: 'double',
  },
  'metrics.hw.power_supply.usage': {
    name: 'metrics.hw.power_supply.usage',
    description: 'Current power output of the power supply.',
    type: 'double',
  },
  'metrics.system.uptime': {
    name: 'metrics.system.uptime',
    description: 'The time the system has been running.',
    type: 'double',
  },
  'metrics.system.cpu.physical.count': {
    name: 'metrics.system.cpu.physical.count',
    description: 'Reports the number of actual physical processor cores on the hardware.',
    type: 'double',
  },
  'metrics.system.cpu.logical.count': {
    name: 'metrics.system.cpu.logical.count',
    description:
      'Reports the number of logical (virtual) processor cores created by the operating system to manage multitasking.',
    type: 'double',
  },
  'metrics.system.cpu.time': {
    name: 'metrics.system.cpu.time',
    description: 'Seconds each logical CPU spent on each mode.',
    type: 'double',
  },
  'metrics.system.cpu.utilization': {
    name: 'metrics.system.cpu.utilization',
    description:
      'For each logical CPU, the utilization is calculated as the change in cumulative CPU time (cpu.time) over a measurement interval, divided by the elapsed time.',
    type: 'double',
  },
  'metrics.system.cpu.frequency': {
    name: 'metrics.system.cpu.frequency',
    description: 'Operating frequency of the logical CPU in Hertz.',
    type: 'double',
  },
  'metrics.system.memory.usage': {
    name: 'metrics.system.memory.usage',
    description: 'Reports memory in use by state.',
    type: 'double',
  },
  'metrics.system.memory.limit': {
    name: 'metrics.system.memory.limit',
    description: 'Total virtual memory available in the system.',
    type: 'double',
  },
  'metrics.system.memory.shared': {
    name: 'metrics.system.memory.shared',
    description: 'Shared memory used (mostly by tmpfs).',
    type: 'double',
  },
  'metrics.system.memory.utilization': {
    name: 'metrics.system.memory.utilization',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.paging.usage': {
    name: 'metrics.system.paging.usage',
    description: 'Unix swap or windows pagefile usage.',
    type: 'double',
  },
  'metrics.system.paging.utilization': {
    name: 'metrics.system.paging.utilization',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.paging.faults': {
    name: 'metrics.system.paging.faults',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.paging.operations': {
    name: 'metrics.system.paging.operations',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.disk.io': {
    name: 'metrics.system.disk.io',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.disk.operations': {
    name: 'metrics.system.disk.operations',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.disk.io_time': {
    name: 'metrics.system.disk.io_time',
    description: 'Time disk spent activated.',
    type: 'double',
  },
  'metrics.system.disk.operation_time': {
    name: 'metrics.system.disk.operation_time',
    description: 'Sum of the time each operation took to complete.',
    type: 'double',
  },
  'metrics.system.disk.merged': {
    name: 'metrics.system.disk.merged',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.disk.limit': {
    name: 'metrics.system.disk.limit',
    description: 'The total storage capacity of the disk.',
    type: 'double',
  },
  'metrics.system.filesystem.usage': {
    name: 'metrics.system.filesystem.usage',
    description: "Reports a filesystem's space usage across different states.",
    type: 'double',
  },
  'metrics.system.filesystem.utilization': {
    name: 'metrics.system.filesystem.utilization',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.filesystem.limit': {
    name: 'metrics.system.filesystem.limit',
    description: 'The total storage capacity of the filesystem.',
    type: 'double',
  },
  'metrics.system.network.packet.dropped': {
    name: 'metrics.system.network.packet.dropped',
    description: 'Count of packets that are dropped or discarded even though there was no error.',
    type: 'double',
  },
  'metrics.system.network.packet.count': {
    name: 'metrics.system.network.packet.count',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.network.errors': {
    name: 'metrics.system.network.errors',
    description: 'Count of network errors detected.',
    type: 'double',
  },
  'metrics.system.network.io': {
    name: 'metrics.system.network.io',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.network.connection.count': {
    name: 'metrics.system.network.connection.count',
    description: 'TODO.',
    type: 'double',
  },
  'metrics.system.process.count': {
    name: 'metrics.system.process.count',
    description: 'Total number of processes in each state.',
    type: 'double',
  },
  'metrics.system.process.created': {
    name: 'metrics.system.process.created',
    description: 'Total number of processes created over uptime of the host.',
    type: 'double',
  },
  'metrics.system.linux.memory.available': {
    name: 'metrics.system.linux.memory.available',
    description:
      'An estimate of how much memory is available for starting new applications, without causing swapping.',
    type: 'double',
  },
  'metrics.system.linux.memory.slab.usage': {
    name: 'metrics.system.linux.memory.slab.usage',
    description:
      'Reports the memory used by the Linux kernel for managing caches of frequently used objects.',
    type: 'double',
  },
  'metrics.signalr.server.connection.duration': {
    name: 'metrics.signalr.server.connection.duration',
    description: 'The duration of connections on the server.',
    type: 'double',
  },
  'metrics.signalr.server.active_connections': {
    name: 'metrics.signalr.server.active_connections',
    description: 'Number of connections that are currently active on the server.',
    type: 'double',
  },
  'metrics.db.client.operation.duration': {
    name: 'metrics.db.client.operation.duration',
    description: 'Duration of database client operations.',
    type: 'double',
  },
  'metrics.db.client.connection.count': {
    name: 'metrics.db.client.connection.count',
    description:
      'The number of connections that are currently in state described by the `state` attribute.',
    type: 'double',
  },
  'metrics.db.client.connection.idle.max': {
    name: 'metrics.db.client.connection.idle.max',
    description: 'The maximum number of idle open connections allowed.',
    type: 'double',
  },
  'metrics.db.client.connection.idle.min': {
    name: 'metrics.db.client.connection.idle.min',
    description: 'The minimum number of idle open connections allowed.',
    type: 'double',
  },
  'metrics.db.client.connection.max': {
    name: 'metrics.db.client.connection.max',
    description: 'The maximum number of open connections allowed.',
    type: 'double',
  },
  'metrics.db.client.connection.pending_requests': {
    name: 'metrics.db.client.connection.pending_requests',
    description: 'The number of current pending requests for an open connection.',
    type: 'double',
  },
  'metrics.db.client.connection.timeouts': {
    name: 'metrics.db.client.connection.timeouts',
    description:
      'The number of connection timeouts that have occurred trying to obtain a connection from the pool.',
    type: 'double',
  },
  'metrics.db.client.connection.create_time': {
    name: 'metrics.db.client.connection.create_time',
    description: 'The time it took to create a new connection.',
    type: 'double',
  },
  'metrics.db.client.connection.wait_time': {
    name: 'metrics.db.client.connection.wait_time',
    description: 'The time it took to obtain an open connection from the pool.',
    type: 'double',
  },
  'metrics.db.client.connection.use_time': {
    name: 'metrics.db.client.connection.use_time',
    description: 'The time between borrowing a connection and returning it to the pool.',
    type: 'double',
  },
  'metrics.db.client.response.returned_rows': {
    name: 'metrics.db.client.response.returned_rows',
    description: 'The actual number of records returned by the database operation.',
    type: 'double',
  },
  'metrics.jvm.memory.used': {
    name: 'metrics.jvm.memory.used',
    description: 'Measure of memory used.',
    type: 'double',
  },
  'metrics.jvm.memory.committed': {
    name: 'metrics.jvm.memory.committed',
    description: 'Measure of memory committed.',
    type: 'double',
  },
  'metrics.jvm.memory.limit': {
    name: 'metrics.jvm.memory.limit',
    description: 'Measure of max obtainable memory.',
    type: 'double',
  },
  'metrics.jvm.memory.used_after_last_gc': {
    name: 'metrics.jvm.memory.used_after_last_gc',
    description:
      'Measure of memory used, as measured after the most recent garbage collection event on this pool.',
    type: 'double',
  },
  'metrics.jvm.gc.duration': {
    name: 'metrics.jvm.gc.duration',
    description: 'Duration of JVM garbage collection actions.',
    type: 'double',
  },
  'metrics.jvm.thread.count': {
    name: 'metrics.jvm.thread.count',
    description: 'Number of executing platform threads.',
    type: 'double',
  },
  'metrics.jvm.class.loaded': {
    name: 'metrics.jvm.class.loaded',
    description: 'Number of classes loaded since JVM start.',
    type: 'double',
  },
  'metrics.jvm.class.unloaded': {
    name: 'metrics.jvm.class.unloaded',
    description: 'Number of classes unloaded since JVM start.',
    type: 'double',
  },
  'metrics.jvm.class.count': {
    name: 'metrics.jvm.class.count',
    description: 'Number of classes currently loaded.',
    type: 'double',
  },
  'metrics.jvm.cpu.count': {
    name: 'metrics.jvm.cpu.count',
    description: 'Number of processors available to the Java virtual machine.',
    type: 'double',
  },
  'metrics.jvm.cpu.time': {
    name: 'metrics.jvm.cpu.time',
    description: 'CPU time used by the process as reported by the JVM.',
    type: 'double',
  },
  'metrics.jvm.cpu.recent_utilization': {
    name: 'metrics.jvm.cpu.recent_utilization',
    description: 'Recent CPU utilization for the process as reported by the JVM.',
    type: 'double',
  },
  'metrics.dotnet.process.cpu.count': {
    name: 'metrics.dotnet.process.cpu.count',
    description: 'The number of processors available to the process.',
    type: 'double',
  },
  'metrics.dotnet.process.cpu.time': {
    name: 'metrics.dotnet.process.cpu.time',
    description: 'CPU time used by the process.',
    type: 'double',
  },
  'metrics.dotnet.process.memory.working_set': {
    name: 'metrics.dotnet.process.memory.working_set',
    description: 'The number of bytes of physical memory mapped to the process context.',
    type: 'double',
  },
  'metrics.dotnet.gc.collections': {
    name: 'metrics.dotnet.gc.collections',
    description:
      'The number of garbage collections that have occurred since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.gc.heap.total_allocated': {
    name: 'metrics.dotnet.gc.heap.total_allocated',
    description:
      'The *approximate* number of bytes allocated on the managed GC heap since the process has started. The returned value does not include any native allocations.',
    type: 'double',
  },
  'metrics.dotnet.gc.last_collection.memory.committed_size': {
    name: 'metrics.dotnet.gc.last_collection.memory.committed_size',
    description:
      'The amount of committed virtual memory in use by the .NET GC, as observed during the latest garbage collection.',
    type: 'double',
  },
  'metrics.dotnet.gc.last_collection.heap.size': {
    name: 'metrics.dotnet.gc.last_collection.heap.size',
    description:
      'The managed GC heap size (including fragmentation), as observed during the latest garbage collection.',
    type: 'double',
  },
  'metrics.dotnet.gc.last_collection.heap.fragmentation.size': {
    name: 'metrics.dotnet.gc.last_collection.heap.fragmentation.size',
    description: 'The heap fragmentation, as observed during the latest garbage collection.',
    type: 'double',
  },
  'metrics.dotnet.gc.pause.time': {
    name: 'metrics.dotnet.gc.pause.time',
    description: 'The total amount of time paused in GC since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.jit.compiled_il.size': {
    name: 'metrics.dotnet.jit.compiled_il.size',
    description:
      'Count of bytes of intermediate language that have been compiled since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.jit.compiled_methods': {
    name: 'metrics.dotnet.jit.compiled_methods',
    description:
      'The number of times the JIT compiler (re)compiled methods since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.jit.compilation.time': {
    name: 'metrics.dotnet.jit.compilation.time',
    description:
      'The amount of time the JIT compiler has spent compiling methods since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.monitor.lock_contentions': {
    name: 'metrics.dotnet.monitor.lock_contentions',
    description:
      'The number of times there was contention when trying to acquire a monitor lock since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.thread_pool.thread.count': {
    name: 'metrics.dotnet.thread_pool.thread.count',
    description: 'The number of thread pool threads that currently exist.',
    type: 'double',
  },
  'metrics.dotnet.thread_pool.work_item.count': {
    name: 'metrics.dotnet.thread_pool.work_item.count',
    description:
      'The number of work items that the thread pool has completed since the process has started.',
    type: 'double',
  },
  'metrics.dotnet.thread_pool.queue.length': {
    name: 'metrics.dotnet.thread_pool.queue.length',
    description:
      'The number of work items that are currently queued to be processed by the thread pool.',
    type: 'double',
  },
  'metrics.dotnet.timer.count': {
    name: 'metrics.dotnet.timer.count',
    description: 'The number of timer instances that are currently active.',
    type: 'double',
  },
  'metrics.dotnet.assembly.count': {
    name: 'metrics.dotnet.assembly.count',
    description: 'The number of .NET assemblies that are currently loaded.',
    type: 'double',
  },
  'metrics.dotnet.exceptions': {
    name: 'metrics.dotnet.exceptions',
    description: 'The number of exceptions that have been thrown in managed code.',
    type: 'double',
  },
  'metrics.aspnetcore.routing.match_attempts': {
    name: 'metrics.aspnetcore.routing.match_attempts',
    description: 'Number of requests that were attempted to be matched to an endpoint.',
    type: 'double',
  },
  'metrics.aspnetcore.diagnostics.exceptions': {
    name: 'metrics.aspnetcore.diagnostics.exceptions',
    description: 'Number of exceptions caught by exception handling middleware.',
    type: 'double',
  },
  'metrics.aspnetcore.rate_limiting.active_request_leases': {
    name: 'metrics.aspnetcore.rate_limiting.active_request_leases',
    description:
      'Number of requests that are currently active on the server that hold a rate limiting lease.',
    type: 'double',
  },
  'metrics.aspnetcore.rate_limiting.request_lease.duration': {
    name: 'metrics.aspnetcore.rate_limiting.request_lease.duration',
    description: 'The duration of rate limiting lease held by requests on the server.',
    type: 'double',
  },
  'metrics.aspnetcore.rate_limiting.request.time_in_queue': {
    name: 'metrics.aspnetcore.rate_limiting.request.time_in_queue',
    description: 'The time the request spent in a queue waiting to acquire a rate limiting lease.',
    type: 'double',
  },
  'metrics.aspnetcore.rate_limiting.queued_requests': {
    name: 'metrics.aspnetcore.rate_limiting.queued_requests',
    description:
      'Number of requests that are currently queued, waiting to acquire a rate limiting lease.',
    type: 'double',
  },
  'metrics.aspnetcore.rate_limiting.requests': {
    name: 'metrics.aspnetcore.rate_limiting.requests',
    description: 'Number of requests that tried to acquire a rate limiting lease.',
    type: 'double',
  },
  'metrics.aspnetcore.memory_pool.pooled': {
    name: 'metrics.aspnetcore.memory_pool.pooled',
    description: 'Number of bytes currently pooled and available for reuse.',
    type: 'double',
  },
  'metrics.aspnetcore.memory_pool.allocated': {
    name: 'metrics.aspnetcore.memory_pool.allocated',
    description:
      'Total number of bytes allocated by the memory pool. Allocation occurs when a memory rental request exceeds the available pooled memory.',
    type: 'double',
  },
  'metrics.aspnetcore.memory_pool.evicted': {
    name: 'metrics.aspnetcore.memory_pool.evicted',
    description:
      'Total number of bytes evicted from the memory pool. Eviction occurs when idle pooled memory is reclaimed.',
    type: 'double',
  },
  'metrics.aspnetcore.memory_pool.rented': {
    name: 'metrics.aspnetcore.memory_pool.rented',
    description: 'Total number of bytes rented from the memory pool.',
    type: 'double',
  },
  'metrics.aspnetcore.authentication.authenticate.duration': {
    name: 'metrics.aspnetcore.authentication.authenticate.duration',
    description: 'The authentication duration for a request.',
    type: 'double',
  },
  'metrics.aspnetcore.authentication.challenges': {
    name: 'metrics.aspnetcore.authentication.challenges',
    description: 'The total number of times a scheme is challenged.',
    type: 'double',
  },
  'metrics.aspnetcore.authentication.forbids': {
    name: 'metrics.aspnetcore.authentication.forbids',
    description:
      'The total number of times an authenticated user attempts to access a resource they are not permitted to access.',
    type: 'double',
  },
  'metrics.aspnetcore.authentication.sign_ins': {
    name: 'metrics.aspnetcore.authentication.sign_ins',
    description: 'The total number of times a principal is signed in with a scheme.',
    type: 'double',
  },
  'metrics.aspnetcore.authentication.sign_outs': {
    name: 'metrics.aspnetcore.authentication.sign_outs',
    description: 'The total number of times a principal is signed out with a scheme.',
    type: 'double',
  },
  'metrics.aspnetcore.authorization.attempts': {
    name: 'metrics.aspnetcore.authorization.attempts',
    description: 'The total number of authorization attempts.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.user.create.duration': {
    name: 'metrics.aspnetcore.identity.user.create.duration',
    description: 'The duration of user creation operations.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.user.update.duration': {
    name: 'metrics.aspnetcore.identity.user.update.duration',
    description: 'The duration of user update operations.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.user.delete.duration': {
    name: 'metrics.aspnetcore.identity.user.delete.duration',
    description: 'The duration of user deletion operations.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.user.check_password_attempts': {
    name: 'metrics.aspnetcore.identity.user.check_password_attempts',
    description:
      'The number of check password attempts. Only checks whether the password is valid and not whether the user account is in a state that can log in.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.user.verify_token_attempts': {
    name: 'metrics.aspnetcore.identity.user.verify_token_attempts',
    description: 'The total number of token verification attempts.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.user.generated_tokens': {
    name: 'metrics.aspnetcore.identity.user.generated_tokens',
    description: 'The total number of token generations.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.sign_in.authenticate.duration': {
    name: 'metrics.aspnetcore.identity.sign_in.authenticate.duration',
    description:
      'The duration of authenticate attempts. The authenticate metrics is recorded by sign in methods such as PasswordSignInAsync and TwoFactorSignInAsync.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.sign_in.two_factor_clients_remembered': {
    name: 'metrics.aspnetcore.identity.sign_in.two_factor_clients_remembered',
    description: 'The total number of two factor clients remembered.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.sign_in.two_factor_clients_forgotten': {
    name: 'metrics.aspnetcore.identity.sign_in.two_factor_clients_forgotten',
    description: 'The total number of two factor clients forgotten.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.sign_in.check_password_attempts': {
    name: 'metrics.aspnetcore.identity.sign_in.check_password_attempts',
    description:
      'The total number of check password attempts. Checks that the account is in a state that can log in and that the password is valid using the UserManager.CheckPasswordAsync method.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.sign_in.sign_ins': {
    name: 'metrics.aspnetcore.identity.sign_in.sign_ins',
    description: 'The total number of calls to sign in user principals.',
    type: 'double',
  },
  'metrics.aspnetcore.identity.sign_in.sign_outs': {
    name: 'metrics.aspnetcore.identity.sign_in.sign_outs',
    description: 'The total number of calls to sign out user principals.',
    type: 'double',
  },
  'metrics.rpc.server.duration': {
    name: 'metrics.rpc.server.duration',
    description: 'Measures the duration of inbound RPC.',
    type: 'double',
  },
  'metrics.rpc.server.request.size': {
    name: 'metrics.rpc.server.request.size',
    description: 'Measures the size of RPC request messages (uncompressed).',
    type: 'double',
  },
  'metrics.rpc.server.response.size': {
    name: 'metrics.rpc.server.response.size',
    description: 'Measures the size of RPC response messages (uncompressed).',
    type: 'double',
  },
  'metrics.rpc.server.requests_per_rpc': {
    name: 'metrics.rpc.server.requests_per_rpc',
    description: 'Measures the number of messages received per RPC.',
    type: 'double',
  },
  'metrics.rpc.server.responses_per_rpc': {
    name: 'metrics.rpc.server.responses_per_rpc',
    description: 'Measures the number of messages sent per RPC.',
    type: 'double',
  },
  'metrics.rpc.client.duration': {
    name: 'metrics.rpc.client.duration',
    description: 'Measures the duration of outbound RPC.',
    type: 'double',
  },
  'metrics.rpc.client.request.size': {
    name: 'metrics.rpc.client.request.size',
    description: 'Measures the size of RPC request messages (uncompressed).',
    type: 'double',
  },
  'metrics.rpc.client.response.size': {
    name: 'metrics.rpc.client.response.size',
    description: 'Measures the size of RPC response messages (uncompressed).',
    type: 'double',
  },
  'metrics.rpc.client.requests_per_rpc': {
    name: 'metrics.rpc.client.requests_per_rpc',
    description: 'Measures the number of messages received per RPC.',
    type: 'double',
  },
  'metrics.rpc.client.responses_per_rpc': {
    name: 'metrics.rpc.client.responses_per_rpc',
    description: 'Measures the number of messages sent per RPC.',
    type: 'double',
  },
  'metrics.go.memory.used': {
    name: 'metrics.go.memory.used',
    description: 'Memory used by the Go runtime.',
    type: 'double',
  },
  'metrics.go.memory.limit': {
    name: 'metrics.go.memory.limit',
    description: 'Go runtime memory limit configured by the user, if a limit exists.',
    type: 'double',
  },
  'metrics.go.memory.allocated': {
    name: 'metrics.go.memory.allocated',
    description: 'Memory allocated to the heap by the application.',
    type: 'double',
  },
  'metrics.go.memory.allocations': {
    name: 'metrics.go.memory.allocations',
    description: 'Count of allocations to the heap by the application.',
    type: 'double',
  },
  'metrics.go.memory.gc.goal': {
    name: 'metrics.go.memory.gc.goal',
    description: 'Heap size target for the end of the GC cycle.',
    type: 'double',
  },
  'metrics.go.goroutine.count': {
    name: 'metrics.go.goroutine.count',
    description: 'Count of live goroutines.',
    type: 'double',
  },
  'metrics.go.processor.limit': {
    name: 'metrics.go.processor.limit',
    description: 'The number of OS threads that can execute user-level Go code simultaneously.',
    type: 'double',
  },
  'metrics.go.schedule.duration': {
    name: 'metrics.go.schedule.duration',
    description:
      'The time goroutines have spent in the scheduler in a runnable state before actually running.',
    type: 'double',
  },
  'metrics.go.config.gogc': {
    name: 'metrics.go.config.gogc',
    description: 'Heap size target percentage configured by the user, otherwise 100.',
    type: 'double',
  },
  'metrics.http.server.request.duration': {
    name: 'metrics.http.server.request.duration',
    description: 'Duration of HTTP server requests.',
    type: 'double',
  },
  'metrics.http.server.active_requests': {
    name: 'metrics.http.server.active_requests',
    description: 'Number of active HTTP server requests.',
    type: 'double',
  },
  'metrics.http.server.request.body.size': {
    name: 'metrics.http.server.request.body.size',
    description: 'Size of HTTP server request bodies.',
    type: 'double',
  },
  'metrics.http.server.response.body.size': {
    name: 'metrics.http.server.response.body.size',
    description: 'Size of HTTP server response bodies.',
    type: 'double',
  },
  'metrics.http.client.request.duration': {
    name: 'metrics.http.client.request.duration',
    description: 'Duration of HTTP client requests.',
    type: 'double',
  },
  'metrics.http.client.request.body.size': {
    name: 'metrics.http.client.request.body.size',
    description: 'Size of HTTP client request bodies.',
    type: 'double',
  },
  'metrics.http.client.response.body.size': {
    name: 'metrics.http.client.response.body.size',
    description: 'Size of HTTP client response bodies.',
    type: 'double',
  },
  'metrics.http.client.open_connections': {
    name: 'metrics.http.client.open_connections',
    description:
      'Number of outbound HTTP connections that are currently active or idle on the client.',
    type: 'double',
  },
  'metrics.http.client.connection.duration': {
    name: 'metrics.http.client.connection.duration',
    description: 'The duration of the successfully established outbound HTTP connections.',
    type: 'double',
  },
  'metrics.http.client.active_requests': {
    name: 'metrics.http.client.active_requests',
    description: 'Number of active HTTP requests.',
    type: 'double',
  },
  'metrics.cicd.pipeline.run.duration': {
    name: 'metrics.cicd.pipeline.run.duration',
    description: 'Duration of a pipeline run grouped by pipeline, state and result.',
    type: 'double',
  },
  'metrics.cicd.pipeline.run.active': {
    name: 'metrics.cicd.pipeline.run.active',
    description: 'The number of pipeline runs currently active in the system by state.',
    type: 'double',
  },
  'metrics.cicd.worker.count': {
    name: 'metrics.cicd.worker.count',
    description: 'The number of workers on the CICD system by state.',
    type: 'double',
  },
  'metrics.cicd.pipeline.run.errors': {
    name: 'metrics.cicd.pipeline.run.errors',
    description: 'The number of errors encountered in pipeline runs (eg. compile, test failures).',
    type: 'double',
  },
  'metrics.cicd.system.errors': {
    name: 'metrics.cicd.system.errors',
    description:
      'The number of errors in a component of the CICD system (eg. controller, scheduler, agent).',
    type: 'double',
  },
} as const;
