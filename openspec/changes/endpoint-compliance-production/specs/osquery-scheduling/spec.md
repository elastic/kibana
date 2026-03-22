## ADDED Requirements

### Requirement: Fleet pack deployment integration
The system SHALL integrate with Fleet APIs to deploy compliance osquery packs to agent policies with real query scheduling.

#### Scenario: Pack creation from compliance rules
- **WHEN** compliance rules are enabled for a benchmark
- **THEN** the system generates an osquery pack configuration with all enabled rule queries
- **AND** each query is scheduled with its configured interval
- **AND** the pack includes proper naming conventions and metadata

#### Scenario: Pack deployment to agent policies
- **WHEN** a compliance pack is ready for deployment
- **THEN** the system identifies target agent policies based on platform compatibility
- **AND** the system adds the compliance pack to eligible agent policies via Fleet API
- **AND** the deployment tracks success/failure status per policy

### Requirement: Query scheduling configuration
The system SHALL configure osquery scheduling parameters based on rule metadata and system performance requirements.

#### Scenario: Interval-based scheduling
- **WHEN** a compliance rule specifies an execution interval
- **THEN** the osquery pack includes that interval in the query schedule
- **AND** default intervals are applied when not specified (300 seconds)
- **AND** minimum intervals are enforced to prevent system overload (60 seconds)

#### Scenario: Platform-specific query deployment
- **WHEN** compliance rules target specific platforms (darwin, windows, linux)
- **THEN** the system deploys queries only to compatible agent policies
- **AND** incompatible platform queries are excluded from the pack
- **AND** deployment logs specify platform filtering decisions

### Requirement: Pack lifecycle management
The system SHALL manage the complete lifecycle of compliance packs including updates and removal.

#### Scenario: Pack updates on rule changes
- **WHEN** compliance rules are modified, enabled, or disabled
- **THEN** the system regenerates the affected compliance pack
- **AND** the updated pack is redeployed to all target agent policies
- **AND** agents receive the updated pack configuration within 5 minutes

#### Scenario: Pack removal on benchmark disable
- **WHEN** a compliance benchmark is disabled
- **THEN** the system removes associated packs from all agent policies
- **AND** running compliance queries for that benchmark are stopped on agents
- **AND** pack removal is confirmed before marking the benchmark as disabled

### Requirement: Fleet integration error handling
The system SHALL handle Fleet API failures gracefully with appropriate retry mechanisms and error reporting.

#### Scenario: Fleet API connectivity failures
- **WHEN** Fleet API requests fail due to network or service issues
- **THEN** the system retries with exponential backoff up to 3 attempts
- **AND** persistent failures are logged with detailed error context
- **AND** pack deployment status reflects the failure state

#### Scenario: Agent policy update conflicts
- **WHEN** concurrent updates to agent policies cause conflicts
- **THEN** the system detects and resolves conflicts by retrying the operation
- **AND** conflict resolution prioritizes compliance pack integrity
- **AND** unresolvable conflicts are escalated to error logs

### Requirement: Deployment validation and verification
The system SHALL verify successful pack deployment and provide deployment status reporting.

#### Scenario: Pack deployment verification
- **WHEN** a compliance pack is deployed to agent policies
- **THEN** the system verifies the pack appears in the policy configuration
- **AND** it confirms query schedules match the intended configuration
- **AND** deployment status is tracked per policy and made available via API

#### Scenario: Agent execution monitoring
- **WHEN** compliance queries should be running on agents
- **THEN** the system monitors for expected query results in Elasticsearch
- **AND** missing results trigger investigation workflows
- **AND** agents with deployment issues are identified and reported