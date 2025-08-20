/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file is auto-generated. Do not edit manually.
// Generated on: 2025-08-20T16:07:17.881Z
// Source: resolved-semconv.yaml
// Registry groups: 132
// Metric groups: 347
// Total fields: 956

export const semconvFlat = {
  'webengine.name': 'The name of the web engine.',
  'webengine.version': 'The version of the web engine.',
  'webengine.description':
    'Additional description of the web engine (e.g. detailed version and edition information).',
  'oci.manifest.digest':
    'The digest of the OCI image manifest. For container images specifically is the digest by which the container image is known.',
  'destination.address':
    'Destination address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
  'destination.port': 'Destination port number',
  'browser.brands': 'Array of brand name and version separated by a space',
  'browser.platform': 'The platform on which the browser is running',
  'browser.mobile': 'A boolean that is true if the browser is running on a mobile device',
  'browser.language': 'Preferred language of the user using the browser',
  'cassandra.coordinator.dc': 'The data center of the coordinating node for a query.',
  'cassandra.coordinator.id': 'The ID of the coordinating node for a query.',
  'cassandra.consistency.level':
    'The consistency level of the query. Based on consistency values from [CQL](https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/dml/dmlConfigConsistency.html).',
  'cassandra.query.idempotent': 'Whether or not the query is idempotent.',
  'cassandra.page.size':
    'The fetch size used for paging, i.e. how many rows will be returned at once.',
  'cassandra.speculative_execution.count':
    'The number of times a query was speculatively executed. Not set or `0` if the query was not executed speculatively.',
  'mainframe.lpar.name':
    'Name of the logical partition that hosts a systems with a mainframe operating system.',
  'rpc.connect_rpc.error_code':
    'The [error codes](https://connectrpc.com//docs/protocol/#error-codes) of the Connect request. Error codes are always string values.',
  'rpc.connect_rpc.request.metadata':
    'Connect request metadata, `<key>` being the normalized Connect Metadata key (lowercase), the value being the metadata values.',
  'rpc.connect_rpc.response.metadata':
    'Connect response metadata, `<key>` being the normalized Connect Metadata key (lowercase), the value being the metadata values.',
  'rpc.grpc.status_code':
    'The gRPC status code of the last gRPC requests performed in scope of this export call.',
  'rpc.grpc.request.metadata':
    'gRPC request metadata, `<key>` being the normalized gRPC Metadata key (lowercase), the value being the metadata values.',
  'rpc.grpc.response.metadata':
    'gRPC response metadata, `<key>` being the normalized gRPC Metadata key (lowercase), the value being the metadata values.',
  'rpc.jsonrpc.error_code': '`error.code` property of response if it is an error response.',
  'rpc.jsonrpc.error_message': '`error.message` property of response if it is an error response.',
  'rpc.jsonrpc.request_id':
    '`id` property of request or response. Since protocol allows id to be int, string, `null` or missing (for notifications), value is expected to be cast to string for simplicity. Use empty string in case of `null` value. Omit entirely if this is a notification.',
  'rpc.jsonrpc.version':
    "Protocol version as in `jsonrpc` property of request/response. Since JSON-RPC 1.0 doesn't specify this, the value can be omitted.",
  'rpc.method':
    'The name of the (logical) method being called, must be equal to the $method part in the span name.',
  'rpc.service':
    'The full (logical) name of the service being called, including its package name, if applicable.',
  'rpc.system':
    'A string identifying the remoting system. See below for a list of well-known identifiers.',
  'rpc.message.type': 'Whether this is a received or sent message.',
  'rpc.message.id':
    'MUST be calculated as two different counters starting from `1` one for sent messages and one for received message.',
  'rpc.message.compressed_size': 'Compressed size of the message in bytes.',
  'rpc.message.uncompressed_size': 'Uncompressed size of the message in bytes.',
  'openai.request.service_tier':
    'The service tier requested. May be a specific tier, default, or auto.',
  'openai.response.service_tier': 'The service tier used for the response.',
  'openai.response.system_fingerprint':
    'A fingerprint to track any eventual change in the Generative AI environment.',
  'opentracing.ref_type': 'Parent-child Reference type',
  'cloudfoundry.system.id': 'A guid or another name describing the event source.',
  'cloudfoundry.system.instance.id': 'A guid describing the concrete instance of the event source.',
  'cloudfoundry.app.name': 'The name of the application.',
  'cloudfoundry.app.id': 'The guid of the application.',
  'cloudfoundry.app.instance.id':
    'The index of the application instance. 0 when just one instance is active.',
  'cloudfoundry.space.name': 'The name of the CloudFoundry space the application is running in.',
  'cloudfoundry.space.id': 'The guid of the CloudFoundry space the application is running in.',
  'cloudfoundry.org.name': 'The name of the CloudFoundry organization the app is running in.',
  'cloudfoundry.org.id': 'The guid of the CloudFoundry org the application is running in.',
  'cloudfoundry.process.id': 'The UID identifying the process.',
  'cloudfoundry.process.type': 'The type of process.',
  'server.address':
    'Server domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
  'server.port': 'Server port number.',
  'system.cpu.logical_number': 'Deprecated, use `cpu.logical_number` instead.',
  'vcs.repository.url.full':
    'The [canonical URL](https://support.google.com/webmasters/answer/10347851?hl=en#:~:text=A%20canonical%20URL%20is%20the,Google%20chooses%20one%20as%20canonical.) of the repository providing the complete HTTP(S) address in order to locate and identify the repository through a browser.',
  'vcs.repository.name':
    'The human readable name of the repository. It SHOULD NOT include any additional identifier like Group/SubGroup in GitLab or organization in GitHub.',
  'vcs.ref.base.name':
    'The name of the [reference](https://git-scm.com/docs/gitglossary#def_ref) such as **branch** or **tag** in the repository.',
  'vcs.ref.base.type':
    'The type of the [reference](https://git-scm.com/docs/gitglossary#def_ref) in the repository.',
  'vcs.ref.base.revision':
    'The revision, literally [revised version](https://www.merriam-webster.com/dictionary/revision), The revision most often refers to a commit object in Git, or a revision number in SVN.',
  'vcs.ref.head.name':
    'The name of the [reference](https://git-scm.com/docs/gitglossary#def_ref) such as **branch** or **tag** in the repository.',
  'vcs.ref.head.type':
    'The type of the [reference](https://git-scm.com/docs/gitglossary#def_ref) in the repository.',
  'vcs.ref.head.revision':
    'The revision, literally [revised version](https://www.merriam-webster.com/dictionary/revision), The revision most often refers to a commit object in Git, or a revision number in SVN.',
  'vcs.ref.type':
    'The type of the [reference](https://git-scm.com/docs/gitglossary#def_ref) in the repository.',
  'vcs.revision_delta.direction': 'The type of revision comparison.',
  'vcs.line_change.type': 'The type of line change being measured on a branch or change.',
  'vcs.change.title':
    'The human readable title of the change (pull request/merge request/changelist). This title is often a brief summary of the change and may get merged in to a ref as the commit summary.',
  'vcs.change.id':
    'The ID of the change (pull request/merge request/changelist) if applicable. This is usually a unique (within repository) identifier generated by the VCS system.',
  'vcs.change.state': 'The state of the change (pull request/merge request/changelist).',
  'vcs.owner.name': 'The group owner within the version control system.',
  'vcs.provider.name': 'The name of the version control system provider.',
  'android.os.api_level':
    'Uniquely identifies the framework API revision offered by a version (`os.version`) of the android operating system. More information can be found [here](https://developer.android.com/guide/topics/manifest/uses-sdk-element#ApiLevels).',
  'android.app.state': 'This attribute represents the state of the application.',
  'telemetry.sdk.name': 'The name of the telemetry SDK as defined above.',
  'telemetry.sdk.language': 'The language of the telemetry SDK.',
  'telemetry.sdk.version': 'The version string of the telemetry SDK.',
  'telemetry.distro.name': 'The name of the auto instrumentation agent or distribution, if used.',
  'telemetry.distro.version':
    'The version string of the auto instrumentation agent or distribution, if used.',
  'error.type': 'Describes a class of error the operation ended with.',
  'error.message': 'A message providing more detail about an error in human-readable form.',
  'go.memory.type': 'The type of memory.',
  'heroku.release.creation_timestamp': 'Time and date the release was created',
  'heroku.release.commit': 'Commit hash for the current release',
  'heroku.app.id': 'Unique identifier for the application',
  'signalr.connection.status': 'SignalR HTTP connection closure status.',
  'signalr.transport':
    '[SignalR transport type](https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/TransportProtocols.md)',
  'code.function.name':
    "The method or function fully-qualified name without arguments. The value should fit the natural representation of the language runtime, which is also likely the same used within `code.stacktrace` attribute value. This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Function'. This constraint is imposed to prevent redundancy and maintain data integrity.",
  'code.file.path':
    "The source code file name that identifies the code unit as uniquely as possible (preferably an absolute file path). This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Function'. This constraint is imposed to prevent redundancy and maintain data integrity.",
  'code.line.number':
    "The line number in `code.file.path` best representing the operation. It SHOULD point within the code unit named in `code.function.name`. This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Line'. This constraint is imposed to prevent redundancy and maintain data integrity.",
  'code.column.number':
    "The column number in `code.file.path` best representing the operation. It SHOULD point within the code unit named in `code.function.name`. This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Line'. This constraint is imposed to prevent redundancy and maintain data integrity.",
  'code.stacktrace':
    "A stacktrace as a string in the natural representation for the language runtime. The representation is identical to [`exception.stacktrace`](/docs/exceptions/exceptions-spans.md#stacktrace-representation). This attribute MUST NOT be used on the Profile signal since the data is already captured in 'message Location'. This constraint is imposed to prevent redundancy and maintain data integrity.",
  'url.domain': 'Domain extracted from the `url.full`, such as "opentelemetry.io".',
  'url.extension': 'The file extension extracted from the `url.full`, excluding the leading dot.',
  'url.fragment':
    'The [URI fragment](https://www.rfc-editor.org/rfc/rfc3986#section-3.5) component',
  'url.full':
    'Absolute URL describing a network resource according to [RFC3986](https://www.rfc-editor.org/rfc/rfc3986)',
  'url.original': 'Unmodified original URL as seen in the event source.',
  'url.path': 'The [URI path](https://www.rfc-editor.org/rfc/rfc3986#section-3.3) component',
  'url.port': 'Port extracted from the `url.full`',
  'url.query': 'The [URI query](https://www.rfc-editor.org/rfc/rfc3986#section-3.4) component',
  'url.registered_domain': 'The highest registered url domain, stripped of the subdomain.',
  'url.scheme':
    'The [URI scheme](https://www.rfc-editor.org/rfc/rfc3986#section-3.1) component identifying the used protocol.',
  'url.subdomain':
    'The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain. In a partially qualified domain, or if the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.',
  'url.template':
    'The low-cardinality template of an [absolute path reference](https://www.rfc-editor.org/rfc/rfc3986#section-4.2).',
  'url.top_level_domain':
    'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is `com`.',
  'system.device': 'The device identifier',
  'system.memory.state': 'The memory state',
  'system.paging.state': 'The memory paging state',
  'system.paging.type': 'The memory paging type',
  'system.paging.direction': 'The paging access direction',
  'system.filesystem.state': 'The filesystem state',
  'system.filesystem.type': 'The filesystem type',
  'system.filesystem.mode': 'The filesystem mode',
  'system.filesystem.mountpoint': 'The filesystem mount path',
  'system.process.status':
    'The process state, e.g., [Linux Process State Codes](https://man7.org/linux/man-pages/man1/ps.1.html#PROCESS_STATE_CODES)',
  'gen_ai.provider.name':
    'The Generative AI provider as identified by the client or server instrumentation.',
  'gen_ai.request.model': 'The name of the GenAI model a request is being made to.',
  'gen_ai.request.max_tokens': 'The maximum number of tokens the model generates for a request.',
  'gen_ai.request.choice.count': 'The target number of candidate completions to return.',
  'gen_ai.request.temperature': 'The temperature setting for the GenAI request.',
  'gen_ai.request.top_p': 'The top_p sampling setting for the GenAI request.',
  'gen_ai.request.top_k': 'The top_k sampling setting for the GenAI request.',
  'gen_ai.request.stop_sequences':
    'List of sequences that the model will use to stop generating further tokens.',
  'gen_ai.request.frequency_penalty': 'The frequency penalty setting for the GenAI request.',
  'gen_ai.request.presence_penalty': 'The presence penalty setting for the GenAI request.',
  'gen_ai.request.encoding_formats':
    'The encoding formats requested in an embeddings operation, if specified.',
  'gen_ai.request.seed': 'Requests with same seed value more likely to return same result.',
  'gen_ai.response.id': 'The unique identifier for the completion.',
  'gen_ai.response.model': 'The name of the model that generated the response.',
  'gen_ai.response.finish_reasons':
    'Array of reasons the model stopped generating tokens, corresponding to each generation received.',
  'gen_ai.usage.input_tokens': 'The number of tokens used in the GenAI input (prompt).',
  'gen_ai.usage.output_tokens': 'The number of tokens used in the GenAI response (completion).',
  'gen_ai.token.type': 'The type of token being counted.',
  'gen_ai.conversation.id':
    'The unique identifier for a conversation (session, thread), used to store and correlate messages within this conversation.',
  'gen_ai.agent.id': 'The unique identifier of the GenAI agent.',
  'gen_ai.agent.name': 'Human-readable name of the GenAI agent provided by the application.',
  'gen_ai.agent.description':
    'Free-form description of the GenAI agent provided by the application.',
  'gen_ai.tool.name': 'Name of the tool utilized by the agent.',
  'gen_ai.tool.call.id': 'The tool call identifier.',
  'gen_ai.tool.description': 'The tool description.',
  'gen_ai.tool.type': 'Type of the tool utilized by the agent',
  'gen_ai.data_source.id': 'The data source identifier.',
  'gen_ai.operation.name': 'The name of the operation being performed.',
  'gen_ai.output.type': 'Represents the content type requested by the client.',
  'host.id':
    'Unique host ID. For Cloud, this must be the instance_id assigned by the cloud provider. For non-containerized systems, this should be the `machine-id`. See the table below for the sources to use to determine the `machine-id` based on operating system.',
  'host.name':
    'Name of the host. On Unix systems, it may contain what the hostname command returns, or the fully qualified hostname, or another name specified by the user.',
  'host.type': 'Type of host. For Cloud, this must be the machine type.',
  'host.arch': 'The CPU architecture the host system is running on.',
  'host.image.name': 'Name of the VM image or OS install the host was instantiated from.',
  'host.image.id': 'VM image ID or host OS image ID. For Cloud, this value is from the provider.',
  'host.image.version':
    'The version string of the VM image or host OS as defined in [Version Attributes](/docs/resource/README.md#version-attributes).',
  'host.ip': 'Available IP addresses of the host, excluding loopback interfaces.',
  'host.mac': 'Available MAC addresses of the host, excluding loopback interfaces.',
  'host.cpu.vendor.id': 'Processor manufacturer identifier. A maximum 12-character string.',
  'host.cpu.family': 'Family or generation of the CPU.',
  'host.cpu.model.id':
    'Model identifier. It provides more granular information about the CPU, distinguishing it from other CPUs within the same family.',
  'host.cpu.model.name': 'Model designation of the processor.',
  'host.cpu.stepping': 'Stepping or core revisions.',
  'host.cpu.cache.l2.size':
    'The amount of level 2 memory cache available to the processor (in Bytes).',
  'enduser.id':
    'Unique identifier of an end user in the system. It maybe a username, email address, or other identifier.',
  'enduser.pseudo.id':
    "Pseudonymous identifier of an end user. This identifier should be a random value that is not directly linked or associated with the end user's actual identity.",
  'network.carrier.icc':
    'The ISO 3166-1 alpha-2 2-character country code associated with the mobile carrier network.',
  'network.carrier.mcc': 'The mobile carrier country code.',
  'network.carrier.mnc': 'The mobile carrier network code.',
  'network.carrier.name': 'The name of the mobile carrier.',
  'network.connection.subtype':
    'This describes more details regarding the connection.type. It may be the type of cell technology connection, but it could be used for describing details about a wifi connection.',
  'network.connection.type': 'The internet connection type.',
  'network.local.address':
    'Local address of the network connection - IP address or Unix domain socket name.',
  'network.local.port': 'Local port number of the network connection.',
  'network.peer.address':
    'Peer address of the network connection - IP address or Unix domain socket name.',
  'network.peer.port': 'Peer port number of the network connection.',
  'network.protocol.name':
    '[OSI application layer](https://wikipedia.org/wiki/Application_layer) or non-OSI equivalent.',
  'network.protocol.version': 'The actual version of the protocol used for network communication.',
  'network.transport':
    '[OSI transport layer](https://wikipedia.org/wiki/Transport_layer) or [inter-process communication method](https://wikipedia.org/wiki/Inter-process_communication).',
  'network.type':
    '[OSI network layer](https://wikipedia.org/wiki/Network_layer) or non-OSI equivalent.',
  'network.io.direction': 'The network IO operation direction.',
  'network.interface.name': 'The network interface name.',
  'network.connection.state': 'The state of network connection',
  'profile.frame.type': 'Describes the interpreter or compiler of a single frame.',
  'cloud.provider': 'Name of the cloud provider.',
  'cloud.account.id': 'The cloud account ID the resource is assigned to.',
  'cloud.region':
    'The geographical region within a cloud provider. When associated with a resource, this attribute specifies the region where the resource operates. When calling services or APIs deployed on a cloud, this attribute identifies the region where the called destination is deployed.',
  'cloud.resource_id':
    'Cloud provider-specific native identifier of the monitored cloud resource (e.g. an [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) on AWS, a [fully qualified resource ID](https://learn.microsoft.com/rest/api/resources/resources/get-by-id) on Azure, a [full resource name](https://google.aip.dev/122#full-resource-names) on GCP)',
  'cloud.availability_zone':
    'Cloud regions often have multiple, isolated locations known as zones to increase availability. Availability zone represents the zone where the resource is running.',
  'cloud.platform': 'The cloud platform in use.',
  'session.id': 'A unique id to identify a session.',
  'session.previous_id': 'The previous `session.id` for this user, when known.',
  'cloudevents.event_id':
    'The [event_id](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#id) uniquely identifies the event.',
  'cloudevents.event_source':
    'The [source](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#source-1) identifies the context in which an event happened.',
  'cloudevents.event_spec_version':
    'The [version of the CloudEvents specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#specversion) which the event uses.',
  'cloudevents.event_type':
    'The [event_type](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#type) contains a value describing the type of event related to the originating occurrence.',
  'cloudevents.event_subject':
    'The [subject](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#subject) of the event in the context of the event producer (identified by source).',
  'test.suite.name':
    'The human readable name of a [test suite](https://wikipedia.org/wiki/Test_suite).',
  'test.suite.run.status': 'The status of the test suite run.',
  'test.case.name':
    'The fully qualified human readable name of the [test case](https://wikipedia.org/wiki/Test_case).',
  'test.case.result.status': 'The status of the actual test case result from test execution.',
  'geo.locality.name':
    'Locality name. Represents the name of a city, town, village, or similar populated place.',
  'geo.continent.code': 'Two-letter code representing continent’s name.',
  'geo.country.iso_code':
    'Two-letter ISO Country Code ([ISO 3166-1 alpha2](https://wikipedia.org/wiki/ISO_3166-1#Codes)).',
  'geo.location.lon':
    'Longitude of the geo location in [WGS84](https://wikipedia.org/wiki/World_Geodetic_System#WGS84).',
  'geo.location.lat':
    'Latitude of the geo location in [WGS84](https://wikipedia.org/wiki/World_Geodetic_System#WGS84).',
  'geo.postal_code':
    'Postal code associated with the location. Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
  'geo.region.iso_code': 'Region ISO code ([ISO 3166-2](https://wikipedia.org/wiki/ISO_3166-2)).',
  'process.pid': 'Process identifier (PID).',
  'process.parent_pid': 'Parent Process identifier (PPID).',
  'process.vpid': 'Virtual process identifier.',
  'process.session_leader.pid':
    "The PID of the process's session leader. This is also the session ID (SID) of the process.",
  'process.group_leader.pid':
    "The PID of the process's group leader. This is also the process group ID (PGID) of the process.",
  'process.executable.build_id.gnu':
    'The GNU build ID as found in the `.note.gnu.build-id` ELF section (hex string).',
  'process.executable.build_id.go':
    'The Go build ID as retrieved by `go tool buildid <go executable>`.',
  'process.executable.build_id.htlhash':
    'Profiling specific build ID for executables. See the OTel specification for Profiles for more information.',
  'process.executable.name':
    'The name of the process executable. On Linux based systems, this SHOULD be set to the base name of the target of `/proc/[pid]/exe`. On Windows, this SHOULD be set to the base name of `GetProcessImageFileNameW`.',
  'process.executable.path':
    'The full path to the process executable. On Linux based systems, can be set to the target of `proc/[pid]/exe`. On Windows, can be set to the result of `GetProcessImageFileNameW`.',
  'process.command':
    'The command used to launch the process (i.e. the command name). On Linux based systems, can be set to the zeroth string in `proc/[pid]/cmdline`. On Windows, can be set to the first parameter extracted from `GetCommandLineW`.',
  'process.command_line':
    'The full command used to launch the process as a single string representing the full command. On Windows, can be set to the result of `GetCommandLineW`. Do not set this if you have to assemble it just for monitoring; use `process.command_args` instead. SHOULD NOT be collected by default unless there is sanitization that excludes sensitive data.',
  'process.command_args':
    'All the command arguments (including the command/executable itself) as received by the process. On Linux-based systems (and some other Unixoid systems supporting procfs), can be set according to the list of null-delimited strings extracted from `proc/[pid]/cmdline`. For libc-based executables, this would be the full argv vector passed to `main`. SHOULD NOT be collected by default unless there is sanitization that excludes sensitive data.',
  'process.args_count': 'Length of the process.command_args array',
  'process.owner': 'The username of the user that owns the process.',
  'process.user.id': 'The effective user ID (EUID) of the process.',
  'process.user.name': 'The username of the effective user of the process.',
  'process.real_user.id': 'The real user ID (RUID) of the process.',
  'process.real_user.name': 'The username of the real user of the process.',
  'process.saved_user.id': 'The saved user ID (SUID) of the process.',
  'process.saved_user.name': 'The username of the saved user.',
  'process.runtime.name': 'The name of the runtime of this process.',
  'process.runtime.version':
    'The version of the runtime of this process, as returned by the runtime without modification.',
  'process.runtime.description':
    'An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment.',
  'process.title': 'Process title (proctitle)',
  'process.creation.time': 'The date and time the process was created, in ISO 8601 format.',
  'process.exit.time': 'The date and time the process exited, in ISO 8601 format.',
  'process.exit.code': 'The exit code of the process.',
  'process.interactive': 'Whether the process is connected to an interactive shell.',
  'process.working_directory': 'The working directory of the process.',
  'process.context_switch_type':
    'Specifies whether the context switches for this data point were voluntary or involuntary.',
  'process.paging.fault_type':
    'The type of page fault for this data point. Type `major` is for major/hard page faults, and `minor` is for minor/soft page faults.',
  'process.environment_variable':
    'Process environment variables, `<key>` being the environment variable name, the value being the environment variable value.',
  'process.linux.cgroup': 'The control group associated with the process.',
  'aspnetcore.rate_limiting.policy': 'Rate limiting policy name.',
  'aspnetcore.rate_limiting.result':
    'Rate-limiting result, shows whether the lease was acquired or contains a rejection reason',
  'aspnetcore.routing.is_fallback':
    'A value that indicates whether the matched route is a fallback route.',
  'aspnetcore.diagnostics.handler.type':
    'Full type name of the [`IExceptionHandler`](https://learn.microsoft.com/dotnet/api/microsoft.aspnetcore.diagnostics.iexceptionhandler) implementation that handled the exception.',
  'aspnetcore.request.is_unhandled':
    'Flag indicating if request was handled by the application pipeline.',
  'aspnetcore.routing.match_status': 'Match result - success or failure',
  'aspnetcore.diagnostics.exception.result': 'ASP.NET Core exception middleware handling result',
  'file.accessed': 'Time when the file was last accessed, in ISO 8601 format.',
  'file.attributes': 'Array of file attributes.',
  'file.created': 'Time when the file was created, in ISO 8601 format.',
  'file.changed': 'Time when the file attributes or metadata was last changed, in ISO 8601 format.',
  'file.directory':
    'Directory where the file is located. It should include the drive letter, when appropriate.',
  'file.extension': 'File extension, excluding the leading dot.',
  'file.fork_name':
    'Name of the fork. A fork is additional data associated with a filesystem object.',
  'file.group.id': 'Primary Group ID (GID) of the file.',
  'file.group.name': 'Primary group name of the file.',
  'file.inode': 'Inode representing the file in the filesystem.',
  'file.mode': 'Mode of the file in octal representation.',
  'file.modified': 'Time when the file content was last modified, in ISO 8601 format.',
  'file.name': 'Name of the file including the extension, without the directory.',
  'file.owner.id': 'The user ID (UID) or security identifier (SID) of the file owner.',
  'file.owner.name': 'Username of the file owner.',
  'file.path':
    'Full path to the file, including the file name. It should include the drive letter, when appropriate.',
  'file.size': 'File size in bytes.',
  'file.symbolic_link.target_path': 'Path to the target of a symbolic link.',
  'graphql.operation.name': 'The name of the operation being executed.',
  'graphql.operation.type': 'The type of the operation being executed.',
  'graphql.document': 'The GraphQL document being executed.',
  'os.type': 'The operating system type.',
  'os.description':
    'Human readable (not intended to be parsed) OS version information, like e.g. reported by `ver` or `lsb_release -a` commands.',
  'os.name': 'Human readable operating system name.',
  'os.version':
    'The version string of the operating system as defined in [Version Attributes](/docs/resource/README.md#version-attributes).',
  'os.build_id': 'Unique identifier for a particular build or compilation of the operating system.',
  'client.address':
    'Client address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
  'client.port': 'Client port number.',
  'db.collection.name': 'Cosmos DB container name.',
  'db.namespace': 'The name of the database, fully qualified within the server address and port.',
  'db.operation.name': 'The name of the operation or command being executed.',
  'db.query.text': 'The database query being executed.',
  'db.query.parameter':
    'A database query parameter, with `<key>` being the parameter name, and the attribute value being a string representation of the parameter value.',
  'db.query.summary': 'Low cardinality summary of a database query.',
  'db.stored_procedure.name': 'The name of a stored procedure within the database.',
  'db.operation.parameter':
    'A database operation parameter, with `<key>` being the parameter name, and the attribute value being a string representation of the parameter value.',
  'db.operation.batch.size': 'The number of queries included in a batch operation.',
  'db.response.status_code': 'Database response status code.',
  'db.response.returned_rows': 'Number of rows returned by the operation.',
  'db.system.name':
    'The database management system (DBMS) product as identified by the client instrumentation.',
  'db.client.connection.state': 'The state of a connection in the pool',
  'db.client.connection.pool.name':
    "The name of the connection pool; unique within the instrumented application. In case the connection pool implementation doesn't provide a name, instrumentation SHOULD use a combination of parameters that would make the name unique, for example, combining attributes `server.address`, `server.port`, and `db.namespace`, formatted as `server.address:server.port/db.namespace`. Instrumentations that generate connection pool name following different patterns SHOULD document it.",
  'feature_flag.key': 'The lookup key of the feature flag.',
  'feature_flag.provider.name': 'Identifies the feature flag provider.',
  'feature_flag.result.variant': 'A semantic identifier for an evaluated flag value.',
  'feature_flag.context.id':
    'The unique identifier for the flag evaluation context. For example, the targeting key.',
  'feature_flag.version':
    'The version of the ruleset used during the evaluation. This may be any stable value which uniquely identifies the ruleset.',
  'feature_flag.set.id':
    'The identifier of the [flag set](https://openfeature.dev/specification/glossary/#flag-set) to which the feature flag belongs.',
  'feature_flag.result.reason':
    'The reason code which shows how a feature flag value was determined.',
  'feature_flag.result.value': 'The evaluated value of the feature flag.',
  'security_rule.category':
    'A categorization value keyword used by the entity using the rule for detection of this event',
  'security_rule.description': 'The description of the rule generating the event.',
  'security_rule.license':
    'Name of the license under which the rule used to generate this event is made available.',
  'security_rule.name': 'The name of the rule or signature generating the event.',
  'security_rule.reference':
    'Reference URL to additional information about the rule used to generate this event.',
  'security_rule.ruleset.name':
    'Name of the ruleset, policy, group, or parent category in which the rule used to generate this event is a member.',
  'security_rule.uuid':
    'A rule ID that is unique within the scope of a set or group of agents, observers, or other entities using the rule for detection of this event.',
  'security_rule.version': 'The version / revision of the rule being used for analysis.',
  'cicd.pipeline.name': 'The human readable name of the pipeline within a CI/CD system.',
  'cicd.pipeline.run.id': 'The unique identifier of a pipeline run within a CI/CD system.',
  'cicd.pipeline.run.url.full':
    'The [URL](https://wikipedia.org/wiki/URL) of the pipeline run, providing the complete address in order to locate and identify the pipeline run.',
  'cicd.pipeline.run.state': 'The pipeline run goes through these states during its lifecycle.',
  'cicd.pipeline.task.name':
    'The human readable name of a task within a pipeline. Task here most closely aligns with a [computing process](https://wikipedia.org/wiki/Pipeline_(computing)) in a pipeline. Other terms for tasks include commands, steps, and procedures.',
  'cicd.pipeline.task.run.id': 'The unique identifier of a task run within a pipeline.',
  'cicd.pipeline.task.run.url.full':
    'The [URL](https://wikipedia.org/wiki/URL) of the pipeline task run, providing the complete address in order to locate and identify the pipeline task run.',
  'cicd.pipeline.task.run.result': 'The result of a task run.',
  'cicd.pipeline.task.type': 'The type of the task within a pipeline.',
  'cicd.pipeline.result': 'The result of a pipeline run.',
  'cicd.pipeline.action.name': 'The kind of action a pipeline run is performing.',
  'cicd.worker.id': 'The unique identifier of a worker within a CICD system.',
  'cicd.worker.name': 'The name of a worker within a CICD system.',
  'cicd.worker.url.full':
    'The [URL](https://wikipedia.org/wiki/URL) of the worker, providing the complete address in order to locate and identify the worker.',
  'cicd.worker.state': 'The state of a CICD worker / agent.',
  'cicd.system.component': 'The name of a component of the CICD system.',
  'linux.memory.slab.state': 'The Linux Slab memory state',
  'log.iostream': 'The stream associated with the log. See below for a list of well-known values.',
  'log.file.name': 'The basename of the file.',
  'log.file.path': 'The full path to the file.',
  'log.file.name_resolved': 'The basename of the file, with symlinks resolved.',
  'log.file.path_resolved': 'The full path to the file, with symlinks resolved.',
  'log.record.uid': 'A unique identifier for the Log Record.',
  'log.record.original': 'The complete original Log Record.',
  'aws.request_id':
    'The AWS request ID as returned in the response headers `x-amzn-requestid`, `x-amzn-request-id` or `x-amz-request-id`.',
  'aws.extended_request_id':
    'The AWS extended request ID as returned in the response header `x-amz-id-2`.',
  'aws.dynamodb.table_names': 'The keys in the `RequestItems` object field.',
  'aws.dynamodb.consumed_capacity':
    'The JSON-serialized value of each item in the `ConsumedCapacity` response field.',
  'aws.dynamodb.item_collection_metrics':
    'The JSON-serialized value of the `ItemCollectionMetrics` response field.',
  'aws.dynamodb.provisioned_read_capacity':
    'The value of the `ProvisionedThroughput.ReadCapacityUnits` request parameter.',
  'aws.dynamodb.provisioned_write_capacity':
    'The value of the `ProvisionedThroughput.WriteCapacityUnits` request parameter.',
  'aws.dynamodb.consistent_read': 'The value of the `ConsistentRead` request parameter.',
  'aws.dynamodb.projection': 'The value of the `ProjectionExpression` request parameter.',
  'aws.dynamodb.limit': 'The value of the `Limit` request parameter.',
  'aws.dynamodb.attributes_to_get': 'The value of the `AttributesToGet` request parameter.',
  'aws.dynamodb.index_name': 'The value of the `IndexName` request parameter.',
  'aws.dynamodb.select': 'The value of the `Select` request parameter.',
  'aws.dynamodb.global_secondary_indexes':
    'The JSON-serialized value of each item of the `GlobalSecondaryIndexes` request field',
  'aws.dynamodb.local_secondary_indexes':
    'The JSON-serialized value of each item of the `LocalSecondaryIndexes` request field.',
  'aws.dynamodb.exclusive_start_table':
    'The value of the `ExclusiveStartTableName` request parameter.',
  'aws.dynamodb.table_count': 'The number of items in the `TableNames` response parameter.',
  'aws.dynamodb.scan_forward': 'The value of the `ScanIndexForward` request parameter.',
  'aws.dynamodb.segment': 'The value of the `Segment` request parameter.',
  'aws.dynamodb.total_segments': 'The value of the `TotalSegments` request parameter.',
  'aws.dynamodb.count': 'The value of the `Count` response parameter.',
  'aws.dynamodb.scanned_count': 'The value of the `ScannedCount` response parameter.',
  'aws.dynamodb.attribute_definitions':
    'The JSON-serialized value of each item in the `AttributeDefinitions` request field.',
  'aws.dynamodb.global_secondary_index_updates':
    'The JSON-serialized value of each item in the `GlobalSecondaryIndexUpdates` request field.',
  'aws.ecs.container.arn':
    'The Amazon Resource Name (ARN) of an [ECS container instance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).',
  'aws.ecs.cluster.arn':
    'The ARN of an [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html).',
  'aws.ecs.launchtype':
    'The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.',
  'aws.ecs.task.arn':
    'The ARN of a running [ECS task](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-account-settings.html#ecs-resource-ids).',
  'aws.ecs.task.family':
    'The family name of the [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) used to create the ECS task.',
  'aws.ecs.task.id': 'The ID of a running ECS task. The ID MUST be extracted from `task.arn`.',
  'aws.ecs.task.revision': 'The revision for the task definition used to create the ECS task.',
  'aws.eks.cluster.arn': 'The ARN of an EKS cluster.',
  'aws.log.group.names': 'The name(s) of the AWS log group(s) an application is writing to.',
  'aws.log.group.arns': 'The Amazon Resource Name(s) (ARN) of the AWS log group(s).',
  'aws.log.stream.names': 'The name(s) of the AWS log stream(s) an application is writing to.',
  'aws.log.stream.arns': 'The ARN(s) of the AWS log stream(s).',
  'aws.lambda.invoked_arn':
    'The full invoked ARN as provided on the `Context` passed to the function (`Lambda-Runtime-Invoked-Function-Arn` header on the `/runtime/invocation/next` applicable).',
  'aws.lambda.resource_mapping.id':
    "The UUID of the [AWS Lambda EvenSource Mapping](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html). An event source is mapped to a lambda function. It's contents are read by Lambda and used to trigger a function. This isn't available in the lambda execution context or the lambda runtime environtment. This is going to be populated by the AWS SDK for each language when that UUID is present. Some of these operations are Create/Delete/Get/List/Update EventSourceMapping.",
  'aws.s3.bucket':
    'The S3 bucket name the request refers to. Corresponds to the `--bucket` parameter of the [S3 API](https://docs.aws.amazon.com/cli/latest/reference/s3api/index.html) operations.',
  'aws.s3.key':
    'The S3 object key the request refers to. Corresponds to the `--key` parameter of the [S3 API](https://docs.aws.amazon.com/cli/latest/reference/s3api/index.html) operations.',
  'aws.s3.copy_source': 'The source object (in the form `bucket`/`key`) for the copy operation.',
  'aws.s3.upload_id': 'Upload ID that identifies the multipart upload.',
  'aws.s3.delete': 'The delete request container that specifies the objects to be deleted.',
  'aws.s3.part_number':
    'The part number of the part being uploaded in a multipart-upload operation. This is a positive integer between 1 and 10,000.',
  'aws.sqs.queue.url':
    "The URL of the AWS SQS Queue. It's a unique identifier for a queue in Amazon Simple Queue Service (SQS) and is used to access the queue and perform actions on it.",
  'aws.sns.topic.arn':
    'The ARN of the AWS SNS Topic. An Amazon SNS [topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html) is a logical access point that acts as a communication channel.',
  'aws.kinesis.stream_name':
    'The name of the AWS Kinesis [stream](https://docs.aws.amazon.com/streams/latest/dev/introduction.html) the request refers to. Corresponds to the `--stream-name` parameter of the Kinesis [describe-stream](https://docs.aws.amazon.com/cli/latest/reference/kinesis/describe-stream.html) operation.',
  'aws.step_functions.activity.arn': 'The ARN of the AWS Step Functions Activity.',
  'aws.step_functions.state_machine.arn': 'The ARN of the AWS Step Functions State Machine.',
  'aws.secretsmanager.secret.arn': 'The ARN of the Secret stored in the Secrets Mangger',
  'aws.bedrock.guardrail.id':
    'The unique identifier of the AWS Bedrock Guardrail. A [guardrail](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) helps safeguard and prevent unwanted behavior from model responses or user messages.',
  'aws.bedrock.knowledge_base.id':
    'The unique identifier of the AWS Bedrock Knowledge base. A [knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) is a bank of information that can be queried by models to generate more relevant responses and augment prompts.',
  'app.installation.id':
    'A unique identifier representing the installation of an application on a specific device',
  'app.screen.coordinate.x':
    'The x (horizontal) coordinate of a screen coordinate, in screen pixels.',
  'app.screen.coordinate.y': 'The y (vertical) component of a screen coordinate, in screen pixels.',
  'app.widget.id':
    'An identifier that uniquely differentiates this widget from other widgets in the same application.',
  'app.widget.name': 'The name of an application widget.',
  'app.build_id': 'Unique identifier for a particular build or compilation of the application.',
  'k8s.cluster.name': 'The name of the cluster.',
  'k8s.cluster.uid': 'A pseudo-ID for the cluster, set to the UID of the `kube-system` namespace.',
  'k8s.node.name': 'The name of the Node.',
  'k8s.node.uid': 'The UID of the Node.',
  'k8s.node.label':
    'The label placed on the Node, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.node.annotation':
    'The annotation placed on the Node, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.namespace.name': 'The name of the namespace that the pod is running in.',
  'k8s.namespace.label':
    'The label placed on the Namespace, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.namespace.annotation':
    'The annotation placed on the Namespace, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.pod.uid': 'The UID of the Pod.',
  'k8s.pod.name': 'The name of the Pod.',
  'k8s.pod.label':
    'The label placed on the Pod, the `<key>` being the label name, the value being the label value.',
  'k8s.pod.annotation':
    'The annotation placed on the Pod, the `<key>` being the annotation name, the value being the annotation value.',
  'k8s.container.name':
    'The name of the Container from Pod specification, must be unique within a Pod. Container runtime usually uses different globally unique name (`container.name`).',
  'k8s.container.restart_count':
    'Number of times the container was restarted. This attribute can be used to identify a particular container (running or stopped) within a container spec.',
  'k8s.container.status.last_terminated_reason': 'Last terminated reason of the Container.',
  'k8s.replicaset.uid': 'The UID of the ReplicaSet.',
  'k8s.replicaset.name': 'The name of the ReplicaSet.',
  'k8s.replicaset.label':
    'The label placed on the ReplicaSet, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.replicaset.annotation':
    'The annotation placed on the ReplicaSet, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.replicationcontroller.uid': 'The UID of the replication controller.',
  'k8s.replicationcontroller.name': 'The name of the replication controller.',
  'k8s.resourcequota.uid': 'The UID of the resource quota.',
  'k8s.resourcequota.name': 'The name of the resource quota.',
  'k8s.deployment.uid': 'The UID of the Deployment.',
  'k8s.deployment.name': 'The name of the Deployment.',
  'k8s.deployment.label':
    'The label placed on the Deployment, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.deployment.annotation':
    'The annotation placed on the Deployment, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.statefulset.uid': 'The UID of the StatefulSet.',
  'k8s.statefulset.name': 'The name of the StatefulSet.',
  'k8s.statefulset.label':
    'The label placed on the StatefulSet, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.statefulset.annotation':
    'The annotation placed on the StatefulSet, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.daemonset.uid': 'The UID of the DaemonSet.',
  'k8s.daemonset.name': 'The name of the DaemonSet.',
  'k8s.daemonset.label':
    'The label placed on the DaemonSet, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.daemonset.annotation':
    'The annotation placed on the DaemonSet, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.hpa.uid': 'The UID of the horizontal pod autoscaler.',
  'k8s.hpa.name': 'The name of the horizontal pod autoscaler.',
  'k8s.hpa.scaletargetref.kind':
    'The kind of the target resource to scale for the HorizontalPodAutoscaler.',
  'k8s.hpa.scaletargetref.name':
    'The name of the target resource to scale for the HorizontalPodAutoscaler.',
  'k8s.hpa.scaletargetref.api_version':
    'The API version of the target resource to scale for the HorizontalPodAutoscaler.',
  'k8s.hpa.metric.type': 'The type of metric source for the horizontal pod autoscaler.',
  'k8s.job.uid': 'The UID of the Job.',
  'k8s.job.name': 'The name of the Job.',
  'k8s.job.label':
    'The label placed on the Job, the `<key>` being the label name, the value being the label value, even if the value is empty.',
  'k8s.job.annotation':
    'The annotation placed on the Job, the `<key>` being the annotation name, the value being the annotation value, even if the value is empty.',
  'k8s.cronjob.uid': 'The UID of the CronJob.',
  'k8s.cronjob.name': 'The name of the CronJob.',
  'k8s.cronjob.label':
    'The label placed on the CronJob, the `<key>` being the label name, the value being the label value.',
  'k8s.cronjob.annotation':
    'The cronjob annotation placed on the CronJob, the `<key>` being the annotation name, the value being the annotation value.',
  'k8s.volume.name': 'The name of the K8s volume.',
  'k8s.volume.type': 'The type of the K8s volume.',
  'k8s.namespace.phase': 'The phase of the K8s namespace.',
  'k8s.node.condition.type': 'The condition type of a K8s Node.',
  'k8s.node.condition.status': 'The status of the condition, one of True, False, Unknown.',
  'k8s.container.status.state':
    'The state of the container. [K8s ContainerState](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#containerstate-v1-core)',
  'k8s.container.status.reason':
    'The reason for the container state. Corresponds to the `reason` field of the: [K8s ContainerStateWaiting](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#containerstatewaiting-v1-core) or [K8s ContainerStateTerminated](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#containerstateterminated-v1-core)',
  'k8s.hugepage.size': 'The size (identifier) of the K8s huge page.',
  'k8s.storageclass.name':
    'The name of K8s [StorageClass](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#storageclass-v1-storage-k8s-io) object.',
  'k8s.resourcequota.resource_name': 'The name of the K8s resource a resource quota defines.',
  'dotnet.gc.heap.generation': 'Name of the garbage collector managed heap generation.',
  'cpython.gc.generation': 'Value of the garbage collector collection generation.',
  'disk.io.direction': 'The disk IO operation direction.',
  'otel.status_code':
    'Name of the code, either "OK" or "ERROR". MUST NOT be set if the status code is UNSET.',
  'otel.status_description': 'Description of the Status if it has a value, otherwise not set.',
  'otel.span.sampling_result': 'The result value of the sampler for this span',
  'otel.span.parent.origin':
    'Determines whether the span has a parent span, and if so, [whether it is a remote parent](https://opentelemetry.io/docs/specs/otel/trace/api/#isremote)',
  'otel.scope.name':
    'The name of the instrumentation scope - (`InstrumentationScope.Name` in OTLP).',
  'otel.scope.version':
    'The version of the instrumentation scope - (`InstrumentationScope.Version` in OTLP).',
  'otel.scope.schema_url': 'The schema URL of the instrumentation scope.',
  'otel.component.type': 'A name identifying the type of the OpenTelemetry component.',
  'otel.component.name':
    'A name uniquely identifying the instance of the OpenTelemetry component within its containing SDK instance.',
  'zos.smf.id':
    'The System Management Facility (SMF) Identifier uniquely identified a z/OS system within a SYSPLEX or mainframe environment and is used for system and performance analysis.',
  'zos.sysplex.name': 'The name of the SYSPLEX to which the z/OS system belongs too.',
  'device.id': 'A unique identifier representing the device',
  'device.manufacturer': 'The name of the device manufacturer',
  'device.model.identifier': 'The model identifier for the device',
  'device.model.name': 'The marketing name for the device model',
  'thread.id': 'Current "managed" thread ID (as opposed to OS thread ID).',
  'thread.name': 'Current thread name.',
  'messaging.batch.message_count':
    'The number of messages sent, received, or processed in the scope of the batching operation.',
  'messaging.client.id': 'A unique identifier for the client that consumes or produces a message.',
  'messaging.consumer.group.name':
    'The name of the consumer group with which a consumer is associated.',
  'messaging.destination.name': 'The message destination name',
  'messaging.destination.subscription.name':
    'The name of the destination subscription from which a message is consumed.',
  'messaging.destination.template':
    'Low cardinality representation of the messaging destination name',
  'messaging.destination.anonymous':
    'A boolean that is true if the message destination is anonymous (could be unnamed or have auto-generated name).',
  'messaging.destination.temporary':
    'A boolean that is true if the message destination is temporary and might not exist anymore after messages are processed.',
  'messaging.destination.partition.id':
    'The identifier of the partition messages are sent to or received from, unique within the `messaging.destination.name`.',
  'messaging.message.conversation_id':
    'The conversation ID identifying the conversation to which the message belongs, represented as a string. Sometimes called "Correlation ID".',
  'messaging.message.envelope.size': 'The size of the message body and metadata in bytes.',
  'messaging.message.id':
    'A value used by the messaging system as an identifier for the message, represented as a string.',
  'messaging.message.body.size': 'The size of the message body in bytes.',
  'messaging.operation.type': 'A string identifying the type of the messaging operation.',
  'messaging.operation.name': 'The system-specific name of the messaging operation.',
  'messaging.system': 'The messaging system as identified by the client instrumentation.',
  'messaging.kafka.message.key':
    "Message keys in Kafka are used for grouping alike messages to ensure they're processed on the same partition. They differ from `messaging.message.id` in that they're not unique. If the key is `null`, the attribute MUST NOT be set.",
  'messaging.kafka.offset': 'The offset of a record in the corresponding Kafka partition.',
  'messaging.kafka.message.tombstone': 'A boolean that is true if the message is a tombstone.',
  'messaging.rabbitmq.destination.routing_key': 'RabbitMQ message routing key.',
  'messaging.rabbitmq.message.delivery_tag': 'RabbitMQ message delivery tag',
  'messaging.rocketmq.consumption_model':
    'Model of message consumption. This only applies to consumer spans.',
  'messaging.rocketmq.message.delay_time_level':
    'The delay time level for delay message, which determines the message delay time.',
  'messaging.rocketmq.message.delivery_timestamp':
    'The timestamp in milliseconds that the delay message is expected to be delivered to consumer.',
  'messaging.rocketmq.message.group':
    'It is essential for FIFO message. Messages that belong to the same message group are always processed one by one within the same consumer group.',
  'messaging.rocketmq.message.keys':
    'Key(s) of message, another way to mark message besides message id.',
  'messaging.rocketmq.message.tag': 'The secondary classifier of message besides topic.',
  'messaging.rocketmq.message.type': 'Type of message.',
  'messaging.rocketmq.namespace':
    'Namespace of RocketMQ resources, resources in different namespaces are individual.',
  'messaging.gcp_pubsub.message.ordering_key':
    'The ordering key for a given message. If the attribute is not present, the message does not have an ordering key.',
  'messaging.gcp_pubsub.message.ack_id': 'The ack id for a given message.',
  'messaging.gcp_pubsub.message.ack_deadline':
    'The ack deadline in seconds set for the modify ack deadline request.',
  'messaging.gcp_pubsub.message.delivery_attempt': 'The delivery attempt for a given message.',
  'messaging.servicebus.message.delivery_count':
    'Number of deliveries that have been attempted for this message.',
  'messaging.servicebus.message.enqueued_time':
    'The UTC epoch seconds at which the message has been accepted and stored in the entity.',
  'messaging.servicebus.disposition_status':
    'Describes the [settlement type](https://learn.microsoft.com/azure/service-bus-messaging/message-transfers-locks-settlement#peeklock).',
  'messaging.eventhubs.message.enqueued_time':
    'The UTC epoch seconds at which the message has been accepted and stored in the entity.',
  'cpu.mode': 'The mode of the CPU',
  'cpu.logical_number': 'The logical CPU number [0..n-1]',
  'user_agent.original':
    'Value of the [HTTP User-Agent](https://www.rfc-editor.org/rfc/rfc9110.html#field.user-agent) header sent by the client.',
  'user_agent.name':
    "Name of the user-agent extracted from original. Usually refers to the browser's name.",
  'user_agent.version':
    "Version of the user-agent extracted from original. Usually refers to the browser's version",
  'user_agent.os.name': 'Human readable operating system name.',
  'user_agent.os.version':
    'The version string of the operating system as defined in [Version Attributes](/docs/resource/README.md#version-attributes).',
  'user_agent.synthetic.type':
    'Specifies the category of synthetic traffic, such as tests or bots.',
  'v8js.gc.type': 'The type of garbage collection.',
  'v8js.heap.space.name': 'The name of the space type of heap memory.',
  'source.address':
    'Source address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name.',
  'source.port': 'Source port number',
  'faas.name': 'The name of the single function that this runtime instance executes.',
  'faas.version': 'The immutable version of the function being executed.',
  'faas.instance':
    'The execution environment ID as a string, that will be potentially reused for other invocations to the same function/function version.',
  'faas.max_memory':
    'The amount of memory available to the serverless function converted to Bytes.',
  'faas.trigger': 'Type of the trigger which caused this function invocation.',
  'faas.invoked_name': 'The name of the invoked function.',
  'faas.invoked_provider': 'The cloud provider of the invoked function.',
  'faas.invoked_region': 'The cloud region of the invoked function.',
  'faas.invocation_id': 'The invocation ID of the current function invocation.',
  'faas.time':
    'A string containing the function invocation time in the [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) format expressed in [UTC](https://www.w3.org/TR/NOTE-datetime).',
  'faas.cron':
    'A string containing the schedule period as [Cron Expression](https://docs.oracle.com/cd/E12058_01/doc/doc.1014/e12030/cron_expressions.htm).',
  'faas.coldstart':
    'A boolean that is true if the serverless function is executed for the first time (aka cold-start).',
  'faas.document.collection':
    'The name of the source on which the triggering operation was performed. For example, in Cloud Storage or S3 corresponds to the bucket name, and in Cosmos DB to the database name.',
  'faas.document.operation': 'Describes the type of the operation that was performed on the data.',
  'faas.document.time':
    'A string containing the time when the data was accessed in the [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) format expressed in [UTC](https://www.w3.org/TR/NOTE-datetime).',
  'faas.document.name':
    'The document name/table subjected to the operation. For example, in Cloud Storage or S3 is the name of the file, and in Cosmos DB the table name.',
  'user.email': 'User email address.',
  'user.full_name': "User's full name",
  'user.hash': 'Unique user hash to correlate information for a user in anonymized form.',
  'user.id': 'Unique identifier of the user.',
  'user.name': 'Short name or login/username of the user.',
  'user.roles': 'Array of user roles at the time of the event.',
  'gcp.client.service':
    'Identifies the Google Cloud service for which the official client library is intended.',
  'gcp.cloud_run.job.execution':
    'The name of the Cloud Run [execution](https://cloud.google.com/run/docs/managing/job-executions) being run for the Job, as set by the [`CLOUD_RUN_EXECUTION`](https://cloud.google.com/run/docs/container-contract#jobs-env-vars) environment variable.',
  'gcp.cloud_run.job.task_index':
    'The index for a task within an execution as provided by the [`CLOUD_RUN_TASK_INDEX`](https://cloud.google.com/run/docs/container-contract#jobs-env-vars) environment variable.',
  'gcp.apphub.application.container':
    'The container within GCP where the AppHub application is defined.',
  'gcp.apphub.application.location': 'The GCP zone or region where the application is defined.',
  'gcp.apphub.application.id': 'The name of the application as configured in AppHub.',
  'gcp.apphub.service.id': 'The name of the service as configured in AppHub.',
  'gcp.apphub.service.environment_type':
    'Environment of a service is the stage of a software lifecycle.',
  'gcp.apphub.service.criticality_type':
    'Criticality of a service indicates its importance to the business.',
  'gcp.apphub.workload.id': 'The name of the workload as configured in AppHub.',
  'gcp.apphub.workload.environment_type':
    'Environment of a workload is the stage of a software lifecycle.',
  'gcp.apphub.workload.criticality_type':
    'Criticality of a workload indicates its importance to the business.',
  'gcp.gce.instance.name':
    'The instance name of a GCE instance. This is the value provided by `host.name`, the visible name of the instance in the Cloud Console UI, and the prefix for the default hostname of the instance as defined by the [default internal DNS name](https://cloud.google.com/compute/docs/internal-dns#instance-fully-qualified-domain-names).',
  'gcp.gce.instance.hostname':
    'The hostname of a GCE instance. This is the full value of the default or [custom hostname](https://cloud.google.com/compute/docs/instances/custom-hostname-vm).',
  'container.name': 'Container name used by container runtime.',
  'container.id':
    'Container ID. Usually a UUID, as for example used to [identify Docker containers](https://docs.docker.com/engine/containers/run/#container-identification). The UUID might be abbreviated.',
  'container.runtime.name': 'The container runtime managing this container.',
  'container.runtime.version':
    'The version of the runtime of this process, as returned by the runtime without modification.',
  'container.runtime.description':
    'A description about the runtime which could include, for example details about the CRI/API version being used or other customisations.',
  'container.image.name': 'Name of the image the container was built on.',
  'container.image.tags':
    'Container image tags. An example can be found in [Docker Image Inspect](https://docs.docker.com/engine/api/v1.43/#tag/Image/operation/ImageInspect). Should be only the `<tag>` section of the full name for example from `registry.example.com/my-org/my-image:<tag>`.',
  'container.image.id':
    'Runtime specific image identifier. Usually a hash algorithm followed by a UUID.',
  'container.image.repo_digests':
    'Repo digests of the container image as provided by the container runtime.',
  'container.command': 'The command used to run the container (i.e. the command name).',
  'container.command_line':
    'The full command run by the container as a single string representing the full command.',
  'container.command_args':
    'All the command arguments (including the command/executable itself) run by the container.',
  'container.label':
    'Container labels, `<key>` being the label name, the value being the label value.',
  'container.csi.plugin.name':
    'The name of the CSI ([Container Storage Interface](https://github.com/container-storage-interface/spec)) plugin used by the volume.',
  'container.csi.volume.id':
    'The unique volume ID returned by the CSI ([Container Storage Interface](https://github.com/container-storage-interface/spec)) plugin.',
  'tls.cipher':
    'String indicating the [cipher](https://datatracker.ietf.org/doc/html/rfc5246#appendix-A.5) used during the current connection.',
  'tls.client.certificate':
    'PEM-encoded stand-alone certificate offered by the client. This is usually mutually-exclusive of `client.certificate_chain` since this value also exists in that list.',
  'tls.client.certificate_chain':
    'Array of PEM-encoded certificates that make up the certificate chain offered by the client. This is usually mutually-exclusive of `client.certificate` since that value should be the first certificate in the chain.',
  'tls.client.hash.md5':
    'Certificate fingerprint using the MD5 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.',
  'tls.client.hash.sha1':
    'Certificate fingerprint using the SHA1 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.',
  'tls.client.hash.sha256':
    'Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.',
  'tls.client.issuer':
    'Distinguished name of [subject](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.6) of the issuer of the x.509 certificate presented by the client.',
  'tls.client.ja3':
    'A hash that identifies clients based on how they perform an SSL/TLS handshake.',
  'tls.client.not_after':
    'Date/Time indicating when client certificate is no longer considered valid.',
  'tls.client.not_before':
    'Date/Time indicating when client certificate is first considered valid.',
  'tls.client.subject':
    'Distinguished name of subject of the x.509 certificate presented by the client.',
  'tls.client.supported_ciphers': 'Array of ciphers offered by the client during the client hello.',
  'tls.curve': 'String indicating the curve used for the given cipher, when applicable',
  'tls.established':
    'Boolean flag indicating if the TLS negotiation was successful and transitioned to an encrypted tunnel.',
  'tls.next_protocol':
    'String indicating the protocol being tunneled. Per the values in the [IANA registry](https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids), this string should be lower case.',
  'tls.protocol.name':
    'Normalized lowercase protocol name parsed from original string of the negotiated [SSL/TLS protocol version](https://docs.openssl.org/1.1.1/man3/SSL_get_version/#return-values)',
  'tls.protocol.version':
    'Numeric part of the version parsed from the original string of the negotiated [SSL/TLS protocol version](https://docs.openssl.org/1.1.1/man3/SSL_get_version/#return-values)',
  'tls.resumed':
    'Boolean flag indicating if this TLS connection was resumed from an existing TLS negotiation.',
  'tls.server.certificate':
    'PEM-encoded stand-alone certificate offered by the server. This is usually mutually-exclusive of `server.certificate_chain` since this value also exists in that list.',
  'tls.server.certificate_chain':
    'Array of PEM-encoded certificates that make up the certificate chain offered by the server. This is usually mutually-exclusive of `server.certificate` since that value should be the first certificate in the chain.',
  'tls.server.hash.md5':
    'Certificate fingerprint using the MD5 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.',
  'tls.server.hash.sha1':
    'Certificate fingerprint using the SHA1 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.',
  'tls.server.hash.sha256':
    'Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.',
  'tls.server.issuer':
    'Distinguished name of [subject](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.6) of the issuer of the x.509 certificate presented by the client.',
  'tls.server.ja3s':
    'A hash that identifies servers based on how they perform an SSL/TLS handshake.',
  'tls.server.not_after':
    'Date/Time indicating when server certificate is no longer considered valid.',
  'tls.server.not_before':
    'Date/Time indicating when server certificate is first considered valid.',
  'tls.server.subject':
    'Distinguished name of subject of the x.509 certificate presented by the server.',
  'deployment.name': 'The name of the deployment.',
  'deployment.id': 'The id of the deployment.',
  'deployment.status': 'The status of the deployment.',
  'deployment.environment.name':
    'Name of the [deployment environment](https://wikipedia.org/wiki/Deployment_environment) (aka deployment tier).',
  'peer.service':
    'The [`service.name`](/docs/resource/README.md#service) of the remote service. SHOULD be equal to the actual `service.name` resource attribute of the remote service if any.',
  'ios.app.state': 'This attribute represents the state of the application.',
  'http.request.body.size':
    'The size of the request payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.',
  'http.request.header':
    'HTTP request headers, `<key>` being the normalized HTTP Header name (lowercase), the value being the header values.',
  'http.request.method': 'HTTP request method.',
  'http.request.method_original': 'Original HTTP method sent by the client in the request line.',
  'http.request.resend_count':
    'The ordinal number of request resending attempt (for any reason, including redirects).',
  'http.request.size':
    'The total size of the request in bytes. This should be the total number of bytes sent over the wire, including the request line (HTTP/1.1), framing (HTTP/2 and HTTP/3), headers, and request body if any.',
  'http.response.body.size':
    'The size of the response payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.',
  'http.response.header':
    'HTTP response headers, `<key>` being the normalized HTTP Header name (lowercase), the value being the header values.',
  'http.response.size':
    'The total size of the response in bytes. This should be the total number of bytes sent over the wire, including the status line (HTTP/1.1), framing (HTTP/2 and HTTP/3), headers, and response body and trailers if any.',
  'http.response.status_code':
    '[HTTP response status code](https://tools.ietf.org/html/rfc7231#section-6).',
  'http.route':
    'The matched route, that is, the path template in the format used by the respective server framework.',
  'http.connection.state': 'State of the HTTP connection in the HTTP connection pool.',
  'elasticsearch.node.name':
    'Represents the human-readable identifier of the node/instance to which a request was routed.',
  'nodejs.eventloop.state': 'The state of event loop time.',
  'hw.id': 'An identifier for the hardware component, unique within the monitored host',
  'hw.name': 'An easily-recognizable name for the hardware component',
  'hw.parent':
    'Unique identifier of the parent component (typically the `hw.id` attribute of the enclosure, or disk controller)',
  'hw.type': 'Type of the component',
  'hw.state': 'The current state of the component',
  'azure.service.request.id':
    "The unique identifier of the service request. It's generated by the Azure service and returned with the response.",
  'azure.resource_provider.namespace':
    '[Azure Resource Provider Namespace](https://learn.microsoft.com/azure/azure-resource-manager/management/azure-services-resource-providers) as recognized by the client.',
  'azure.client.id': 'The unique identifier of the client instance.',
  'azure.cosmosdb.connection.mode': 'Cosmos client connection mode.',
  'azure.cosmosdb.operation.request_charge':
    'The number of request units consumed by the operation.',
  'azure.cosmosdb.request.body.size': 'Request payload size in bytes.',
  'azure.cosmosdb.operation.contacted_regions':
    'List of regions contacted during operation in the order that they were contacted. If there is more than one region listed, it indicates that the operation was performed on multiple regions i.e. cross-regional call.',
  'azure.cosmosdb.response.sub_status_code': 'Cosmos DB sub status code.',
  'azure.cosmosdb.consistency.level':
    'Account or request [consistency level](https://learn.microsoft.com/azure/cosmos-db/consistency-levels).',
  'jvm.gc.action': 'Name of the garbage collector action.',
  'jvm.gc.cause': 'Name of the garbage collector cause.',
  'jvm.gc.name': 'Name of the garbage collector.',
  'jvm.memory.type': 'The type of memory.',
  'jvm.memory.pool.name': 'Name of the memory pool.',
  'jvm.thread.daemon': 'Whether the thread is daemon or not.',
  'jvm.thread.state': 'State of the thread.',
  'jvm.buffer.pool.name': 'Name of the buffer pool.',
  'exception.type':
    'The type of the exception (its fully-qualified class name, if applicable). The dynamic type of the exception should be preferred over the static type in languages that support it.',
  'exception.message': 'The exception message.',
  'exception.stacktrace':
    'A stacktrace as a string in the natural representation for the language runtime. The representation is to be determined and documented by each language SIG.',
  'artifact.filename':
    'The human readable file name of the artifact, typically generated during build and release processes. Often includes the package name and version in the file name.',
  'artifact.version': 'The version of the artifact.',
  'artifact.purl':
    'The [Package URL](https://github.com/package-url/purl-spec) of the [package artifact](https://slsa.dev/spec/v1.0/terminology#package-model) provides a standard way to identify and locate the packaged artifact.',
  'artifact.hash':
    'The full [hash value (see glossary)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf), often found in checksum.txt on a release of the artifact and used to verify package integrity.',
  'artifact.attestation.id':
    'The id of the build [software attestation](https://slsa.dev/attestation-model).',
  'artifact.attestation.filename':
    'The provenance filename of the built attestation which directly relates to the build artifact filename. This filename SHOULD accompany the artifact at publish time. See the [SLSA Relationship](https://slsa.dev/spec/v1.0/distributing-provenance#relationship-between-artifacts-and-attestations) specification for more information.',
  'artifact.attestation.hash':
    'The full [hash value (see glossary)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf), of the built attestation. Some envelopes in the [software attestation space](https://github.com/in-toto/attestation/tree/main/spec) also refer to this as the **digest**.',
  'service.name': 'Logical name of the service.',
  'service.version':
    'The version string of the service API or implementation. The format is not defined by these conventions.',
  'service.namespace': 'A namespace for `service.name`.',
  'service.instance.id': 'The string ID of the service instance.',
  'dns.question.name': 'The name being queried.',
  'dns.answers': 'The list of IPv4 or IPv6 addresses resolved during DNS lookup.',
  'go.memory.used': 'Memory used by the Go runtime.',
  'go.memory.limit': 'Go runtime memory limit configured by the user, if a limit exists.',
  'go.memory.allocated': 'Memory allocated to the heap by the application.',
  'go.memory.allocations': 'Count of allocations to the heap by the application.',
  'go.memory.gc.goal': 'Heap size target for the end of the GC cycle.',
  'go.goroutine.count': 'Count of live goroutines.',
  'go.processor.limit':
    'The number of OS threads that can execute user-level Go code simultaneously.',
  'go.schedule.duration':
    'The time goroutines have spent in the scheduler in a runnable state before actually running.',
  'go.config.gogc': 'Heap size target percentage configured by the user, otherwise 100.',
  'cicd.pipeline.run.duration': 'Duration of a pipeline run grouped by pipeline, state and result.',
  'cicd.pipeline.run.active':
    'The number of pipeline runs currently active in the system by state.',
  'cicd.worker.count': 'The number of workers on the CICD system by state.',
  'cicd.pipeline.run.errors':
    'The number of errors encountered in pipeline runs (eg. compile, test failures).',
  'cicd.system.errors':
    'The number of errors in a component of the CICD system (eg. controller, scheduler, agent).',
  'nodejs.eventloop.delay.min': 'Event loop minimum delay.',
  'nodejs.eventloop.delay.max': 'Event loop maximum delay.',
  'nodejs.eventloop.delay.mean': 'Event loop mean delay.',
  'nodejs.eventloop.delay.stddev': 'Event loop standard deviation delay.',
  'nodejs.eventloop.delay.p50': 'Event loop 50 percentile delay.',
  'nodejs.eventloop.delay.p90': 'Event loop 90 percentile delay.',
  'nodejs.eventloop.delay.p99': 'Event loop 99 percentile delay.',
  'nodejs.eventloop.utilization': 'Event loop utilization.',
  'nodejs.eventloop.time': 'Cumulative duration of time the event loop has been in each state.',
  'v8js.gc.duration': 'Garbage collection duration.',
  'v8js.memory.heap.limit': 'Total heap memory size pre-allocated.',
  'v8js.memory.heap.used': 'Heap Memory size allocated.',
  'v8js.heap.space.available_size': 'Heap space available size.',
  'v8js.heap.space.physical_size': 'Committed size of a heap space.',
  'otel.sdk.span.live':
    'The number of created spans with `recording=true` for which the end operation has not been called yet.',
  'otel.sdk.span.started': 'The number of created spans.',
  'otel.sdk.processor.span.queue.size':
    'The number of spans in the queue of a given instance of an SDK span processor.',
  'otel.sdk.processor.span.queue.capacity':
    'The maximum number of spans the queue of a given instance of an SDK span processor can hold.',
  'otel.sdk.processor.span.processed':
    'The number of spans for which the processing has finished, either successful or failed.',
  'otel.sdk.exporter.span.inflight':
    'The number of spans which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).',
  'otel.sdk.exporter.span.exported':
    'The number of spans for which the export has finished, either successful or failed.',
  'otel.sdk.log.created': 'The number of logs submitted to enabled SDK Loggers.',
  'otel.sdk.processor.log.queue.size':
    'The number of log records in the queue of a given instance of an SDK log processor.',
  'otel.sdk.processor.log.queue.capacity':
    'The maximum number of log records the queue of a given instance of an SDK Log Record processor can hold.',
  'otel.sdk.processor.log.processed':
    'The number of log records for which the processing has finished, either successful or failed.',
  'otel.sdk.exporter.log.inflight':
    'The number of log records which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).',
  'otel.sdk.exporter.log.exported':
    'The number of log records for which the export has finished, either successful or failed.',
  'otel.sdk.exporter.metric_data_point.inflight':
    'The number of metric data points which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).',
  'otel.sdk.exporter.metric_data_point.exported':
    'The number of metric data points for which the export has finished, either successful or failed.',
  'otel.sdk.metric_reader.collection.duration':
    'The duration of the collect operation of the metric reader.',
  'otel.sdk.exporter.operation.duration': 'The duration of exporting a batch of telemetry records.',
  'dns.lookup.duration': 'Measures the time taken to perform a DNS lookup.',
  'aspnetcore.routing.match_attempts':
    'Number of requests that were attempted to be matched to an endpoint.',
  'aspnetcore.diagnostics.exceptions':
    'Number of exceptions caught by exception handling middleware.',
  'aspnetcore.rate_limiting.active_request_leases':
    'Number of requests that are currently active on the server that hold a rate limiting lease.',
  'aspnetcore.rate_limiting.request_lease.duration':
    'The duration of rate limiting lease held by requests on the server.',
  'aspnetcore.rate_limiting.request.time_in_queue':
    'The time the request spent in a queue waiting to acquire a rate limiting lease.',
  'aspnetcore.rate_limiting.queued_requests':
    'Number of requests that are currently queued, waiting to acquire a rate limiting lease.',
  'aspnetcore.rate_limiting.requests':
    'Number of requests that tried to acquire a rate limiting lease.',
  'db.client.operation.duration': 'Duration of database client operations.',
  'db.client.connection.count':
    'The number of connections that are currently in state described by the `state` attribute.',
  'db.client.connection.idle.max': 'The maximum number of idle open connections allowed.',
  'db.client.connection.idle.min': 'The minimum number of idle open connections allowed.',
  'db.client.connection.max': 'The maximum number of open connections allowed.',
  'db.client.connection.pending_requests':
    'The number of current pending requests for an open connection.',
  'db.client.connection.timeouts':
    'The number of connection timeouts that have occurred trying to obtain a connection from the pool.',
  'db.client.connection.create_time': 'The time it took to create a new connection.',
  'db.client.connection.wait_time': 'The time it took to obtain an open connection from the pool.',
  'db.client.connection.use_time':
    'The time between borrowing a connection and returning it to the pool.',
  'db.client.response.returned_rows':
    'The actual number of records returned by the database operation.',
  'hw.host.ambient_temperature': 'Ambient (external) temperature of the physical host.',
  'hw.host.energy': 'Total energy consumed by the entire physical host, in joules.',
  'hw.host.heating_margin':
    'By how many degrees Celsius the temperature of the physical host can be increased, before reaching a warning threshold on one of the internal sensors.',
  'hw.host.power':
    'Instantaneous power consumed by the entire physical host in Watts (`hw.host.energy` is preferred).',
  'signalr.server.connection.duration': 'The duration of connections on the server.',
  'signalr.server.active_connections':
    'Number of connections that are currently active on the server.',
  'jvm.memory.used': 'Measure of memory used.',
  'jvm.memory.committed': 'Measure of memory committed.',
  'jvm.memory.limit': 'Measure of max obtainable memory.',
  'jvm.memory.used_after_last_gc':
    'Measure of memory used, as measured after the most recent garbage collection event on this pool.',
  'jvm.gc.duration': 'Duration of JVM garbage collection actions.',
  'jvm.thread.count': 'Number of executing platform threads.',
  'jvm.class.loaded': 'Number of classes loaded since JVM start.',
  'jvm.class.unloaded': 'Number of classes unloaded since JVM start.',
  'jvm.class.count': 'Number of classes currently loaded.',
  'jvm.cpu.count': 'Number of processors available to the Java virtual machine.',
  'jvm.cpu.time': 'CPU time used by the process as reported by the JVM.',
  'jvm.cpu.recent_utilization': 'Recent CPU utilization for the process as reported by the JVM.',
  'system.uptime': 'The time the system has been running.',
  'system.cpu.physical.count':
    'Reports the number of actual physical processor cores on the hardware.',
  'system.cpu.logical.count':
    'Reports the number of logical (virtual) processor cores created by the operating system to manage multitasking.',
  'system.cpu.time': 'Seconds each logical CPU spent on each mode.',
  'system.cpu.utilization':
    'For each logical CPU, the utilization is calculated as the change in cumulative CPU time (cpu.time) over a measurement interval, divided by the elapsed time.',
  'system.cpu.frequency': 'Operating frequency of the logical CPU in Hertz.',
  'system.memory.usage': 'Reports memory in use by state.',
  'system.memory.limit': 'Total virtual memory available in the system.',
  'system.memory.shared': 'Shared memory used (mostly by tmpfs).',
  'system.memory.utilization': 'TODO.',
  'system.paging.usage': 'Unix swap or windows pagefile usage.',
  'system.paging.utilization': 'TODO.',
  'system.paging.faults': 'TODO.',
  'system.paging.operations': 'TODO.',
  'system.disk.io': 'TODO.',
  'system.disk.operations': 'TODO.',
  'system.disk.io_time': 'Time disk spent activated.',
  'system.disk.operation_time': 'Sum of the time each operation took to complete.',
  'system.disk.merged': 'TODO.',
  'system.disk.limit': 'The total storage capacity of the disk.',
  'system.filesystem.usage': "Reports a filesystem's space usage across different states.",
  'system.filesystem.utilization': 'TODO.',
  'system.filesystem.limit': 'The total storage capacity of the filesystem.',
  'system.network.dropped':
    'Count of packets that are dropped or discarded even though there was no error.',
  'system.network.packets': 'TODO.',
  'system.network.errors': 'Count of network errors detected.',
  'system.network.io': 'TODO.',
  'system.network.connection.count': 'TODO.',
  'system.process.count': 'Total number of processes in each state.',
  'system.process.created': 'Total number of processes created over uptime of the host.',
  'system.linux.memory.available':
    'An estimate of how much memory is available for starting new applications, without causing swapping.',
  'system.linux.memory.slab.usage':
    'Reports the memory used by the Linux kernel for managing caches of frequently used objects.',
  'rpc.server.duration': 'Measures the duration of inbound RPC.',
  'rpc.server.request.size': 'Measures the size of RPC request messages (uncompressed).',
  'rpc.server.response.size': 'Measures the size of RPC response messages (uncompressed).',
  'rpc.server.requests_per_rpc': 'Measures the number of messages received per RPC.',
  'rpc.server.responses_per_rpc': 'Measures the number of messages sent per RPC.',
  'rpc.client.duration': 'Measures the duration of outbound RPC.',
  'rpc.client.request.size': 'Measures the size of RPC request messages (uncompressed).',
  'rpc.client.response.size': 'Measures the size of RPC response messages (uncompressed).',
  'rpc.client.requests_per_rpc': 'Measures the number of messages received per RPC.',
  'rpc.client.responses_per_rpc': 'Measures the number of messages sent per RPC.',
  'k8s.pod.uptime': 'The time the Pod has been running.',
  'k8s.pod.cpu.time': 'Total CPU time consumed.',
  'k8s.pod.cpu.usage':
    "Pod's CPU usage, measured in cpus. Range from 0 to the number of allocatable CPUs.",
  'k8s.pod.memory.usage': 'Memory usage of the Pod.',
  'k8s.pod.network.io': 'Network bytes for the Pod.',
  'k8s.pod.network.errors': 'Pod network errors.',
  'k8s.pod.filesystem.available': 'Pod filesystem available bytes.',
  'k8s.pod.filesystem.capacity': 'Pod filesystem capacity.',
  'k8s.pod.filesystem.usage': 'Pod filesystem usage.',
  'k8s.pod.volume.available': 'Pod volume storage space available.',
  'k8s.pod.volume.capacity': 'Pod volume total capacity.',
  'k8s.pod.volume.usage': 'Pod volume usage.',
  'k8s.pod.volume.inode.count': "The total inodes in the filesystem of the Pod's volume.",
  'k8s.pod.volume.inode.used': "The inodes used by the filesystem of the Pod's volume.",
  'k8s.pod.volume.inode.free': "The free inodes in the filesystem of the Pod's volume.",
  'k8s.node.uptime': 'The time the Node has been running.',
  'k8s.node.allocatable.cpu': 'Amount of cpu allocatable on the node.',
  'k8s.node.allocatable.ephemeral_storage': 'Amount of ephemeral-storage allocatable on the node.',
  'k8s.node.allocatable.memory': 'Amount of memory allocatable on the node.',
  'k8s.node.allocatable.pods': 'Amount of pods allocatable on the node.',
  'k8s.node.cpu.time': 'Total CPU time consumed.',
  'k8s.node.cpu.usage':
    "Node's CPU usage, measured in cpus. Range from 0 to the number of allocatable CPUs.",
  'k8s.node.filesystem.available': 'Node filesystem available bytes.',
  'k8s.node.filesystem.capacity': 'Node filesystem capacity.',
  'k8s.node.filesystem.usage': 'Node filesystem usage.',
  'k8s.node.memory.usage': 'Memory usage of the Node.',
  'k8s.node.network.io': 'Network bytes for the Node.',
  'k8s.node.network.errors': 'Node network errors.',
  'k8s.deployment.desired_pods': 'Number of desired replica pods in this deployment.',
  'k8s.deployment.available_pods':
    'Total number of available replica pods (ready for at least minReadySeconds) targeted by this deployment.',
  'k8s.replicaset.desired_pods': 'Number of desired replica pods in this replicaset.',
  'k8s.replicaset.available_pods':
    'Total number of available replica pods (ready for at least minReadySeconds) targeted by this replicaset.',
  'k8s.replicationcontroller.desired_pods':
    'Number of desired replica pods in this replication controller.',
  'k8s.replicationcontroller.available_pods':
    'Total number of available replica pods (ready for at least minReadySeconds) targeted by this replication controller.',
  'k8s.statefulset.desired_pods': 'Number of desired replica pods in this statefulset.',
  'k8s.statefulset.ready_pods':
    'The number of replica pods created for this statefulset with a Ready Condition.',
  'k8s.statefulset.current_pods':
    'The number of replica pods created by the statefulset controller from the statefulset version indicated by currentRevision.',
  'k8s.statefulset.updated_pods':
    'Number of replica pods created by the statefulset controller from the statefulset version indicated by updateRevision.',
  'k8s.hpa.desired_pods':
    'Desired number of replica pods managed by this horizontal pod autoscaler, as last calculated by the autoscaler.',
  'k8s.hpa.current_pods':
    'Current number of replica pods managed by this horizontal pod autoscaler, as last seen by the autoscaler.',
  'k8s.hpa.max_pods':
    'The upper limit for the number of replica pods to which the autoscaler can scale up.',
  'k8s.hpa.min_pods':
    'The lower limit for the number of replica pods to which the autoscaler can scale down.',
  'k8s.hpa.metric.target.cpu.value': 'Target value for CPU resource in HPA config.',
  'k8s.hpa.metric.target.cpu.average_value': 'Target average value for CPU resource in HPA config.',
  'k8s.hpa.metric.target.cpu.average_utilization':
    'Target average utilization, in percentage, for CPU resource in HPA config.',
  'k8s.daemonset.current_scheduled_nodes':
    'Number of nodes that are running at least 1 daemon pod and are supposed to run the daemon pod.',
  'k8s.daemonset.desired_scheduled_nodes':
    'Number of nodes that should be running the daemon pod (including nodes currently running the daemon pod).',
  'k8s.daemonset.misscheduled_nodes':
    'Number of nodes that are running the daemon pod, but are not supposed to run the daemon pod.',
  'k8s.daemonset.ready_nodes':
    'Number of nodes that should be running the daemon pod and have one or more of the daemon pod running and ready.',
  'k8s.job.active_pods': 'The number of pending and actively running pods for a job.',
  'k8s.job.failed_pods': 'The number of pods which reached phase Failed for a job.',
  'k8s.job.successful_pods': 'The number of pods which reached phase Succeeded for a job.',
  'k8s.job.desired_successful_pods':
    'The desired number of successfully finished pods the job should be run with.',
  'k8s.job.max_parallel_pods':
    'The max desired number of pods the job should run at any given time.',
  'k8s.cronjob.active_jobs': 'The number of actively running jobs for a cronjob.',
  'k8s.container.cpu.limit': 'Maximum CPU resource limit set for the container.',
  'k8s.container.cpu.request': 'CPU resource requested for the container.',
  'k8s.container.memory.limit': 'Maximum memory resource limit set for the container.',
  'k8s.container.memory.request': 'Memory resource requested for the container.',
  'k8s.container.storage.limit': 'Maximum storage resource limit set for the container.',
  'k8s.container.storage.request': 'Storage resource requested for the container.',
  'k8s.container.ephemeral_storage.limit':
    'Maximum ephemeral storage resource limit set for the container.',
  'k8s.container.ephemeral_storage.request':
    'Ephemeral storage resource requested for the container.',
  'k8s.container.restart.count':
    'Describes how many times the container has restarted (since the last counter reset).',
  'k8s.container.ready':
    'Indicates whether the container is currently marked as ready to accept traffic, based on its readiness probe (1 = ready, 0 = not ready).',
  'k8s.resourcequota.cpu.limit.hard':
    'The CPU limits in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.cpu.limit.used':
    'The CPU limits in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.cpu.request.hard':
    'The CPU requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.cpu.request.used':
    'The CPU requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.memory.limit.hard':
    'The memory limits in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.memory.limit.used':
    'The memory limits in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.memory.request.hard':
    'The memory requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.memory.request.used':
    'The memory requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.hugepage_count.request.hard':
    'The huge page requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.hugepage_count.request.used':
    'The huge page requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.storage.request.hard':
    'The storage requests in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.storage.request.used':
    'The storage requests in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.persistentvolumeclaim_count.hard':
    'The total number of PersistentVolumeClaims that can exist in the namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.persistentvolumeclaim_count.used':
    'The total number of PersistentVolumeClaims that can exist in the namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.ephemeral_storage.request.hard':
    'The sum of local ephemeral storage requests in the namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.ephemeral_storage.request.used':
    'The sum of local ephemeral storage requests in the namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.ephemeral_storage.limit.hard':
    'The sum of local ephemeral storage limits in the namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.ephemeral_storage.limit.used':
    'The sum of local ephemeral storage limits in the namespace. The value represents the current observed total usage of the resource in the namespace.',
  'k8s.resourcequota.object_count.hard':
    'The object count limits in a specific namespace. The value represents the configured quota limit of the resource in the namespace.',
  'k8s.resourcequota.object_count.used':
    'The object count limits in a specific namespace. The value represents the current observed total usage of the resource in the namespace.',
  'azure.cosmosdb.client.operation.request_charge':
    '[Request units](https://learn.microsoft.com/azure/cosmos-db/request-units) consumed by the operation.',
  'azure.cosmosdb.client.active_instance.count': 'Number of active client instances.',
  'container.uptime': 'The time the container has been running.',
  'container.cpu.time': 'Total CPU time consumed.',
  'container.cpu.usage':
    "Container's CPU usage, measured in cpus. Range from 0 to the number of allocatable CPUs.",
  'container.memory.usage': 'Memory usage of the container.',
  'container.disk.io': 'Disk bytes for the container.',
  'container.network.io': 'Network bytes for the container.',
  'container.filesystem.available': 'Container filesystem available bytes.',
  'container.filesystem.capacity': 'Container filesystem capacity.',
  'container.filesystem.usage': 'Container filesystem usage.',
  'faas.invoke_duration': "Measures the duration of the function's logic execution.",
  'faas.init_duration':
    "Measures the duration of the function's initialization, such as a cold start.",
  'faas.coldstarts': 'Number of invocation cold starts.',
  'faas.errors': 'Number of invocation errors.',
  'faas.invocations': 'Number of successful invocations.',
  'faas.timeouts': 'Number of invocation timeouts.',
  'faas.mem_usage': 'Distribution of max memory usage per invocation.',
  'faas.cpu_usage': 'Distribution of CPU usage per invocation.',
  'faas.net_io': 'Distribution of net I/O usage per invocation.',
  'vcs.change.count':
    'The number of changes (pull requests/merge requests/changelists) in a repository, categorized by their state (e.g. open or merged).',
  'vcs.change.duration':
    'The time duration a change (pull request/merge request/changelist) has been in a given state.',
  'vcs.change.time_to_approval':
    'The amount of time since its creation it took a change (pull request/merge request/changelist) to get the first approval.',
  'vcs.change.time_to_merge':
    'The amount of time since its creation it took a change (pull request/merge request/changelist) to get merged into the target(base) ref.',
  'vcs.repository.count': 'The number of repositories in an organization.',
  'vcs.ref.count': 'The number of refs of type branch or tag in a repository.',
  'vcs.ref.lines_delta':
    'The number of lines added/removed in a ref (branch) relative to the ref from the `vcs.ref.base.name` attribute.',
  'vcs.ref.revisions_delta':
    'The number of revisions (commits) a ref (branch) is ahead/behind the branch from the `vcs.ref.base.name` attribute.',
  'vcs.ref.time':
    'Time a ref (branch) created from the default branch (trunk) has existed. The `ref.type` attribute will always be `branch`.',
  'vcs.contributor.count': 'The number of unique contributors to a repository.',
  'gen_ai.client.token.usage': 'Number of input and output tokens used.',
  'gen_ai.client.operation.duration': 'GenAI operation duration.',
  'gen_ai.server.request.duration':
    'Generative AI server request duration such as time-to-last byte or last output token.',
  'gen_ai.server.time_per_output_token':
    'Time per output token generated after the first token for successful responses.',
  'gen_ai.server.time_to_first_token': 'Time to generate first token for successful responses.',
  'hw.energy': 'Energy consumed by the component.',
  'hw.errors': 'Number of errors encountered by the component.',
  'hw.power': 'Instantaneous power consumed by the component.',
  'hw.status': 'Operational status: `1` (true) or `0` (false) for each of the possible states.',
  'kestrel.active_connections': 'Number of connections that are currently active on the server.',
  'kestrel.connection.duration': 'The duration of connections on the server.',
  'kestrel.rejected_connections': 'Number of connections rejected by the server.',
  'kestrel.queued_connections':
    'Number of connections that are currently queued and are waiting to start.',
  'kestrel.queued_requests':
    'Number of HTTP requests on multiplexed connections (HTTP/2 and HTTP/3) that are currently queued and are waiting to start.',
  'kestrel.upgraded_connections':
    'Number of connections that are currently upgraded (WebSockets). .',
  'kestrel.tls_handshake.duration': 'The duration of TLS handshakes on the server.',
  'kestrel.active_tls_handshakes':
    'Number of TLS handshakes that are currently in progress on the server.',
  'process.cpu.time': 'Total CPU seconds broken down by different states.',
  'process.cpu.utilization':
    'Difference in process.cpu.time since the last measurement, divided by the elapsed time and number of CPUs available to the process.',
  'process.memory.usage': 'The amount of physical memory in use.',
  'process.memory.virtual': 'The amount of committed virtual memory.',
  'process.disk.io': 'Disk bytes transferred.',
  'process.network.io': 'Network bytes transferred.',
  'process.thread.count': 'Process threads count.',
  'process.open_file_descriptor.count': 'Number of file descriptors in use by the process.',
  'process.context_switches': 'Number of times the process has been context switched.',
  'process.paging.faults': 'Number of page faults the process has made.',
  'process.uptime': 'The time the process has been running.',
  'jvm.memory.init': 'Measure of initial memory requested.',
  'jvm.system.cpu.utilization':
    'Recent CPU utilization for the whole system as reported by the JVM.',
  'jvm.system.cpu.load_1m':
    'Average CPU load of the whole system for the last minute as reported by the JVM.',
  'jvm.buffer.memory.used': 'Measure of memory used by buffers.',
  'jvm.buffer.memory.limit': 'Measure of total memory capacity of buffers.',
  'jvm.buffer.count': 'Number of buffers in the pool.',
  'jvm.file_descriptor.count': 'Number of open file descriptors as reported by the JVM.',
  'cpython.gc.collections':
    'The number of times a generation was collected since interpreter start.',
  'cpython.gc.collected_objects':
    'The total number of objects collected inside a generation since interpreter start.',
  'cpython.gc.uncollectable_objects':
    'The total number of objects which were found to be uncollectable inside a generation since interpreter start.',
  'dotnet.process.cpu.count': 'The number of processors available to the process.',
  'dotnet.process.cpu.time': 'CPU time used by the process.',
  'dotnet.process.memory.working_set':
    'The number of bytes of physical memory mapped to the process context.',
  'dotnet.gc.collections':
    'The number of garbage collections that have occurred since the process has started.',
  'dotnet.gc.heap.total_allocated':
    'The *approximate* number of bytes allocated on the managed GC heap since the process has started. The returned value does not include any native allocations.',
  'dotnet.gc.last_collection.memory.committed_size':
    'The amount of committed virtual memory in use by the .NET GC, as observed during the latest garbage collection.',
  'dotnet.gc.last_collection.heap.size':
    'The managed GC heap size (including fragmentation), as observed during the latest garbage collection.',
  'dotnet.gc.last_collection.heap.fragmentation.size':
    'The heap fragmentation, as observed during the latest garbage collection.',
  'dotnet.gc.pause.time': 'The total amount of time paused in GC since the process has started.',
  'dotnet.jit.compiled_il.size':
    'Count of bytes of intermediate language that have been compiled since the process has started.',
  'dotnet.jit.compiled_methods':
    'The number of times the JIT compiler (re)compiled methods since the process has started.',
  'dotnet.jit.compilation.time':
    'The amount of time the JIT compiler has spent compiling methods since the process has started.',
  'dotnet.monitor.lock_contentions':
    'The number of times there was contention when trying to acquire a monitor lock since the process has started.',
  'dotnet.thread_pool.thread.count': 'The number of thread pool threads that currently exist.',
  'dotnet.thread_pool.work_item.count':
    'The number of work items that the thread pool has completed since the process has started.',
  'dotnet.thread_pool.queue.length':
    'The number of work items that are currently queued to be processed by the thread pool.',
  'dotnet.timer.count': 'The number of timer instances that are currently active.',
  'dotnet.assembly.count': 'The number of .NET assemblies that are currently loaded.',
  'dotnet.exceptions': 'The number of exceptions that have been thrown in managed code.',
  'http.server.request.duration': 'Duration of HTTP server requests.',
  'http.server.active_requests': 'Number of active HTTP server requests.',
  'http.server.request.body.size': 'Size of HTTP server request bodies.',
  'http.server.response.body.size': 'Size of HTTP server response bodies.',
  'http.client.request.duration': 'Duration of HTTP client requests.',
  'http.client.request.body.size': 'Size of HTTP client request bodies.',
  'http.client.response.body.size': 'Size of HTTP client response bodies.',
  'http.client.open_connections':
    'Number of outbound HTTP connections that are currently active or idle on the client.',
  'http.client.connection.duration':
    'The duration of the successfully established outbound HTTP connections.',
  'http.client.active_requests': 'Number of active HTTP requests.',
  'messaging.client.operation.duration':
    'Duration of messaging operation initiated by a producer or consumer client.',
  'messaging.process.duration': 'Duration of processing operation.',
  'messaging.client.sent.messages': 'Number of messages producer attempted to send to the broker.',
  'messaging.client.consumed.messages':
    'Number of messages that were delivered to the application.',
} as const;

export type SemconvFieldName = keyof typeof semconvFlat;
export type TSemconvFields = typeof semconvFlat;

// Statistics about the generated data
export const semconvStats = {
  registryGroups: 132,
  metricGroups: 347,
  totalGroups: 479,
  totalFields: 956,
  generatedAt: '2025-08-20T16:07:17.881Z',
} as const;
