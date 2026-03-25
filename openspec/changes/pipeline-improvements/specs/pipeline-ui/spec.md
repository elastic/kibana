## ADDED Requirements

### Requirement: Pipeline Configuration UI
The system SHALL provide a UI for users to configure pipeline parameters (lookback window, similarity thresholds, case matching weights).

#### Scenario: User saves configuration
- **WHEN** user updates weights in the pipeline settings UI and clicks save
- **THEN** the settings are persisted to a space-aware Saved Object and applied to subsequent pipeline runs.

### Requirement: Pipeline Monitoring Dashboard
The system SHALL provide a dashboard tracking pipeline health, execution times, error rates, and cases created.

#### Scenario: User views pipeline health
- **WHEN** user navigates to the Pipeline Monitoring view
- **THEN** the system displays aggregated metrics from the pipeline's execution logs.
