## ADDED Requirements

### Requirement: Compliance posture dashboard

The system SHALL provide a dashboard page at the route `/app/security/endpoint_compliance/dashboard` showing:
1. **Overall posture score** — circular gauge with percentage and passed/failed counts
2. **Score trend chart** — line chart showing score over the last 24 hours (default), 7 days, or 30 days
3. **Benchmark cards** — one card per enabled benchmark showing score, platform icon, rule counts, and a mini section breakdown
4. **Compliance by section** — table of the top 5 worst-performing CIS sections with a `ComplianceScoreBar` (horizontal pass/fail bar)
5. **Worst-performing hosts** — table of the 10 lowest-scoring hosts with score, host name, OS, and last evaluation time

#### Scenario: Dashboard loads with real-time data
- **WHEN** the user navigates to the Endpoint Compliance Dashboard
- **THEN** the dashboard SHALL query the scores and latest findings indices and display all 5 widgets with data no older than 10 minutes

#### Scenario: Dashboard shows empty state when no findings exist
- **WHEN** no compliance findings have been ingested yet
- **THEN** the dashboard SHALL display an empty state with instructions: "Enable a compliance benchmark to start monitoring endpoint posture"

#### Scenario: Time range selector changes trend chart
- **WHEN** the user selects "Last 7 days" in the time range picker
- **THEN** the trend chart SHALL update to show 7 days of score history

### Requirement: Findings explorer page

The system SHALL provide a findings explorer page at `/app/security/endpoint_compliance/findings` with:
1. **Filter bar** — filters for benchmark, section, host, evaluation (passed/failed/na), level, platform
2. **Findings table** — paginated table showing: rule name, rule number, host name, evaluation, section, last evaluated timestamp
3. **Grouping** — ability to group by rule (one row per rule, with host count/pass rate) or by host (one row per host, with rule count/pass rate)
4. **Finding detail flyout** — clicking a finding opens a flyout with: full rule description, remediation guidance, evidence (raw osquery data), framework mappings, and host details

#### Scenario: Filter findings by evaluation
- **WHEN** the user selects `evaluation: failed` in the filter bar
- **THEN** only failed findings SHALL be displayed

#### Scenario: Group findings by rule
- **WHEN** the user selects "Group by Rule" mode
- **THEN** the table SHALL display one row per compliance rule with columns: rule name, rule number, section, host count, pass rate, worst host

#### Scenario: Finding flyout shows remediation
- **WHEN** the user clicks a failed finding row
- **THEN** the flyout SHALL display the rule's `remediation` text and the raw osquery evidence that led to the failure

### Requirement: Rules management page

The system SHALL provide a rules management page at `/app/security/endpoint_compliance/rules` with:
1. **Benchmark tabs** — one tab per benchmark (CIS macOS, CIS Windows, CIS Linux)
2. **Rules table** — paginated table of rules: rule number, name, section, level, enabled, muted
3. **Bulk actions** — select multiple rules and enable/disable/mute/unmute
4. **Framework mapping view** — toggle to see which NIST 800-53 controls each rule maps to
5. **Rule detail flyout** — clicking a rule shows: description, SQL query, remediation, framework mappings, evaluation statistics

#### Scenario: Mute a noisy rule
- **WHEN** the user selects a rule and clicks "Mute"
- **THEN** the rule SHALL be marked as muted, excluded from scoring, and the table SHALL show a "muted" badge

#### Scenario: View rule's SQL query
- **WHEN** the user opens the rule detail flyout
- **THEN** the flyout SHALL display the osquery SQL in a read-only code editor with syntax highlighting

### Requirement: Navigation integration

The system SHALL register navigation links under Security > Manage:
- "Endpoint Compliance" parent link
  - "Dashboard" sub-link
  - "Findings" sub-link
  - "Rules" sub-link

All navigation links SHALL only appear when the `endpointComplianceMonitoring` feature flag is enabled.

#### Scenario: Navigation is hidden when feature flag is off
- **WHEN** the `endpointComplianceMonitoring` experimental feature is disabled
- **THEN** no Endpoint Compliance navigation links SHALL appear in the Security Solution

#### Scenario: Navigation is visible when feature flag is on
- **WHEN** the `endpointComplianceMonitoring` experimental feature is enabled
- **THEN** "Endpoint Compliance" with three sub-links SHALL appear under Security > Manage

### Requirement: Feature flag gating

All Endpoint Compliance UI routes, API routes, background tasks, saved object registrations, and index template creation SHALL be gated behind the `endpointComplianceMonitoring` experimental feature flag. When disabled, the feature SHALL have zero runtime footprint.

#### Scenario: API returns 404 when flag is disabled
- **WHEN** the feature flag is off and a user requests `GET /api/endpoint_compliance/benchmarks`
- **THEN** the system SHALL return HTTP 404

#### Scenario: Background task does not run when flag is disabled
- **WHEN** the feature flag is off
- **THEN** the score aggregation task SHALL NOT be registered with the task manager
