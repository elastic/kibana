## ADDED Requirements

### Requirement: Transform creation for latest findings
The system SHALL automatically create and manage an Elasticsearch transform that deduplicates compliance findings to maintain only the latest finding per host+rule combination.

#### Scenario: Transform setup on plugin initialization
- **WHEN** the osquery plugin starts with compliance monitoring enabled
- **THEN** the system creates a transform named "endpoint_compliance_latest_transform" 
- **AND** the transform reads from logs-endpoint_compliance.findings-*
- **AND** the transform writes to endpoint_compliance.findings_latest-default

#### Scenario: Findings deduplication
- **WHEN** multiple findings exist for the same host ID and rule ID
- **THEN** the transform retains only the finding with the latest @timestamp
- **AND** older findings for the same host+rule are not included in the latest index

### Requirement: Transform configuration and scheduling
The system SHALL configure the transform with appropriate settings for real-time deduplication and error handling.

#### Scenario: Real-time transform processing
- **WHEN** new findings are indexed to the source data stream
- **THEN** the transform processes them within 60 seconds
- **AND** the latest findings index is updated with new/updated findings

#### Scenario: Transform error handling
- **WHEN** the transform encounters processing errors
- **THEN** the system logs detailed error information
- **AND** failed transforms are automatically retried with exponential backoff
- **AND** critical transform failures generate alerting notifications

### Requirement: Index template for latest findings
The system SHALL create and maintain an index template specifically for the deduplicated findings index with optimized mappings.

#### Scenario: Optimized mappings for latest findings
- **WHEN** the findings_latest index template is created
- **THEN** it includes optimized field mappings for frequent queries
- **AND** it configures appropriate shard and replica settings
- **AND** it enables efficient sorting and filtering on timestamp and evaluation fields

### Requirement: Transform monitoring and maintenance
The system SHALL provide monitoring capabilities for transform health and performance.

#### Scenario: Transform health monitoring
- **WHEN** the system checks transform status
- **THEN** it reports transform health (running, stopped, failed)
- **AND** it provides processing statistics (documents processed, failures)
- **AND** it exposes metrics for monitoring systems

#### Scenario: Transform cleanup on feature disable
- **WHEN** compliance monitoring feature is disabled
- **THEN** the system stops and removes the compliance transforms
- **AND** the latest findings indices are marked for cleanup per ILM policy