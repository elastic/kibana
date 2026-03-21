## ADDED Requirements

### Requirement: Snapshot mode via --snapshot flag
The system SHALL support a `--snapshot` flag on `yarn es docker` (CLI) and a `snapshot: true` option (programmatic) that activates snapshot-docker behavior: security enabled, detached mode, readiness check, native realm setup, extra default ES args, host.docker.internal networking, volume-mount intelligence, and seed rewriting.

#### Scenario: Snapshot mode activation
- **WHEN** `yarn es docker --snapshot` is run
- **THEN** the container starts with security enabled, detached mode, readiness check, native realm password setup, extra default ES args, and host.docker.internal networking

#### Scenario: Default mode unchanged
- **WHEN** `yarn es docker` is run without `--snapshot`
- **THEN** the container starts exactly as it does today: security disabled, foreground (attached), no readiness check, no native realm setup

### Requirement: Security enabled in snapshot mode
When `snapshot: true`, the system SHALL enable Elasticsearch security by default, set `ELASTIC_PASSWORD`, and call `NativeRealm.setPasswords()` after the cluster is ready.

#### Scenario: Security in snapshot mode
- **WHEN** `runDockerContainer` is called with `snapshot: true`
- **THEN** security is enabled, `ELASTIC_PASSWORD` is set to the configured password, and native realm users are configured after readiness check

#### Scenario: Security disabled without snapshot
- **WHEN** `runDockerContainer` is called without `snapshot: true`
- **THEN** security is disabled (`xpack.security.enabled=false`) as it is today

#### Scenario: Explicit security override in snapshot mode
- **WHEN** `runDockerContainer` is called with `snapshot: true` and `skipSecuritySetup: true`
- **THEN** security setup is skipped (no password, no native realm)

### Requirement: Background mode with readiness check
The system SHALL support a `--background` flag (CLI) or `background: true` option (programmatic) that runs the container in detached mode and waits for cluster readiness before returning. This is primarily used with `--snapshot`.

#### Scenario: Background mode activation
- **WHEN** `runDockerContainer` is called with `snapshot: true` and `background: true`
- **THEN** the container starts with `--detach`, `waitUntilClusterReady` polls until cluster health is `yellow`, and the function returns the container name as a string

#### Scenario: Ready timeout
- **WHEN** `snapshot: true`, `background: true`, and `readyTimeout: 60000` are passed
- **THEN** the readiness check waits up to 60 seconds before timing out with an error

#### Scenario: Skip ready check
- **WHEN** `snapshot: true`, `background: true`, and `skipReadyCheck: true` are passed
- **THEN** the container starts detached but no readiness check is performed

### Requirement: License support
The system SHALL support a `--license` flag to configure the Elasticsearch license type when running with `--snapshot`.

#### Scenario: Trial license
- **WHEN** `--snapshot --license trial` is passed
- **THEN** `xpack.license.self_generated.type=trial` is added to the ES args

#### Scenario: No license flag
- **WHEN** no `--license` flag is passed
- **THEN** no license-specific ES arg is added (Elasticsearch defaults to basic)

### Requirement: Version resolution
The system SHALL support a `--version` flag that resolves to a Docker image tag in the format `{version}-SNAPSHOT`.

#### Scenario: Explicit version
- **WHEN** `--version 8.17.0` is passed
- **THEN** the Docker image tag resolves to `docker.elastic.co/elasticsearch/elasticsearch:8.17.0-SNAPSHOT`

#### Scenario: Default version
- **WHEN** no `--version` is passed
- **THEN** the version is read from the Kibana `package.json` and the image tag is `{version}-SNAPSHOT`

### Requirement: Container naming
The system SHALL support a `--name` flag for custom container naming to enable parallel container runs.

#### Scenario: Custom name
- **WHEN** `--name es-test-1` is passed
- **THEN** the Docker container is created with `--name es-test-1`

#### Scenario: Default name
- **WHEN** no `--name` is passed
- **THEN** the container is named `es01`

### Requirement: Transport port configuration
The system SHALL support a `--transport-port` flag for configuring the Elasticsearch transport port binding.

#### Scenario: Custom transport port
- **WHEN** `--transport-port 9400` is passed
- **THEN** the Docker container binds port 9400 to the ES transport port (9300 inside the container)

#### Scenario: Default transport port in snapshot mode
- **WHEN** `--snapshot` is used without `--transport-port` but with `--port 9200`
- **THEN** the transport port defaults to `port + 100` (9300)

### Requirement: Docker networking for host communication in snapshot mode
When `snapshot: true`, the system SHALL configure `--add-host host.docker.internal:host-gateway` and rewrite remote cluster seeds.

#### Scenario: Host gateway setup
- **WHEN** `runDockerContainer` starts with `snapshot: true`
- **THEN** `--add-host host.docker.internal:host-gateway` is added to the Docker command

#### Scenario: Remote cluster seed rewriting
- **WHEN** `snapshot: true` and ES args contain `cluster.remote.*.seeds` with `localhost` addresses
- **THEN** `localhost` is replaced with `host.docker.internal` in those seed values

### Requirement: Volume mount intelligence in snapshot mode
When `snapshot: true`, the system SHALL automatically detect `-E path.data` and file-valued `-E` args and handle them appropriately using Docker native volumes or bind mounts.

#### Scenario: Path.data with non-existent local path creates Docker volume
- **WHEN** `snapshot: true` and `-E path.data=../my-data` is passed and the local path does NOT exist on the host
- **THEN** a Docker named volume (derived from the path name, e.g., `kbn-es-my-data`) is created and mounted at `/usr/share/elasticsearch/data` inside the container

#### Scenario: Path.data with existing local directory uses bind mount
- **WHEN** `snapshot: true` and `-E path.data=./existing-data` is passed and the local path exists on the host
- **THEN** the host path is resolved to an absolute path and bind-mounted at `/usr/share/elasticsearch/data` inside the container

#### Scenario: File-valued args
- **WHEN** `snapshot: true` and `-E some.setting=/host/path/to/file.yml` is passed and the path exists on the host
- **THEN** the file is volume-mounted into the container and the `-E` arg is rewritten to use the container path

### Requirement: Extra default ES args in snapshot mode
When `snapshot: true`, the system SHALL apply additional default ES args: `action.destructive_requires_name=true`, `cluster.routing.allocation.disk.threshold_enabled=false`, `ingest.geoip.downloader.enabled=false`, `search.check_ccs_compatibility=true`. These are NOT applied in non-snapshot mode.

#### Scenario: Snapshot default args applied
- **WHEN** `runDockerContainer` is called with `snapshot: true` without custom ES args
- **THEN** the extra default args are included in the Docker command

#### Scenario: Non-snapshot mode unaffected
- **WHEN** `runDockerContainer` is called without `snapshot: true`
- **THEN** only the original default args are applied (security disabled, single-node, heap size)

### Requirement: Container lifecycle management
The system SHALL provide `stopDockerContainer(name)` to stop and remove a named container, replacing `stopDockerSnapshotContainer`.

#### Scenario: Stop running container
- **WHEN** `stopDockerContainer('es-test-1')` is called
- **THEN** `docker kill es-test-1` and `docker rm es-test-1` are executed

#### Scenario: Cluster cleanup on stop
- **WHEN** `Cluster.stopCluster()` is called and a Docker container name was stored
- **THEN** `stopDockerContainer` is called with the stored container name

### Requirement: Removal of snapshot --docker flag
The system SHALL remove the `--docker` flag from the `yarn es snapshot` command with a helpful error message.

#### Scenario: Legacy flag error
- **WHEN** a user runs `yarn es snapshot --docker`
- **THEN** the command exits with an error message: "The --docker flag has been removed from 'es snapshot'. Use 'yarn es docker --snapshot' instead."

### Requirement: Test infrastructure compatibility
The system SHALL update `test_es_cluster.ts` so that `esFrom='docker'` calls `Cluster.runDocker()` with `snapshot: true` and the same options previously passed to `Cluster.runDockerSnapshot()`.

#### Scenario: FTR docker mode
- **WHEN** `TEST_ES_FROM=docker` is set and FTR starts
- **THEN** `Cluster.runDocker()` is called with `snapshot: true`, `background: true`, `kill: true`, `name`, `transportPort`, `license`, `esArgs`, `ssl`, `password`, and the cluster is ready before tests begin

### Requirement: Single runner function
The system SHALL provide a single `runDockerContainer` function. The `runDockerSnapshotContainer` function SHALL be removed. `Cluster.runDockerSnapshot()` SHALL be removed; `Cluster.runDocker()` SHALL absorb its capabilities.

#### Scenario: Function consolidation
- **WHEN** the codebase is searched for `runDockerSnapshotContainer`
- **THEN** no references exist; all Docker container logic flows through `runDockerContainer`
