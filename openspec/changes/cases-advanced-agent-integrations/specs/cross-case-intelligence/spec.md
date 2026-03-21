## ADDED Requirements

### Requirement: Campaign analysis skill correlates multiple cases into a campaign report

The system SHALL provide a skill `campaign-analysis` registered in the Security Solution plugin. The skill SHALL instruct the agent to:

1. **Start from a seed case**: Fetch the seed case and extract its IOCs (from alerts and observables) and MITRE techniques.
2. **Find related cases**: Use two correlation approaches in parallel:
   - **Observable-based**: Query similar cases using `platform.core.cases` searches matching extracted IOCs (IPs, hashes, domains)
   - **Alert-based**: Find cases sharing alert IDs or attack discovery links using `platform.core.cases` with `alertIds` and `security.attack_discovery_search`
3. **Deduplicate and rank**: Merge results, deduplicate by case ID, and rank by correlation strength (number of shared IOCs, shared MITRE techniques, temporal proximity).
4. **Analyze the campaign**: Across all correlated cases, identify:
   - Campaign timeline (earliest to latest alert)
   - Shared IOCs with frequency counts
   - Common MITRE techniques and attack progression
   - Affected entities (hosts, users) with deduplication
   - Attack scope (number of cases, affected hosts/users, severity distribution)
5. **Produce campaign report**: Generate a structured markdown report and add it as a comment to the seed case.

The skill's `getAllowedTools()` SHALL return: `['platform.core.cases', 'platform.core.cases.add_comment', 'security.alerts', 'security.attack_discovery_search', 'security.entity_risk_score', 'security.security_labs_search']`.

#### Scenario: Campaign detected across three cases

- **WHEN** the agent runs `campaign-analysis` on a case whose IOCs (IP 185.220.101.42, hash abc123) also appear in two other cases
- **THEN** the agent produces a campaign report showing all three cases, the shared IOCs, a timeline, affected entities, and recommended containment actions

#### Scenario: No related cases found

- **WHEN** the agent runs `campaign-analysis` on a case with unique IOCs that appear in no other cases
- **THEN** the agent reports: "No related cases found. This appears to be an isolated incident." and suggests monitoring the IOCs for future appearances

#### Scenario: Filtering out common infrastructure

- **WHEN** case observables include common IPs (public DNS resolvers, CDN ranges) that match hundreds of cases
- **THEN** the agent filters these out with: "Excluded {N} common infrastructure IOCs from campaign analysis" and focuses on distinctive indicators

---

### Requirement: IOC sweep tool hunts for indicators across the environment

The system SHALL provide a built-in tool `security.hunt_iocs` registered in the Security Solution plugin. The tool SHALL:

- **Input**: `{ iocs: Array<{ type: 'ipv4' | 'ipv6' | 'sha256' | 'sha1' | 'md5' | 'domain' | 'url' | 'user', value: string }>, timeWindowDays?: number }`
- **Behavior**: For each IOC, generate a templated ES|QL query against the appropriate index pattern:
  - IP → `source.ip`, `destination.ip` in logs and alerts
  - Hash → `process.hash.sha256`, `file.hash.sha256` in endpoint data
  - Domain → `dns.question.name`, `url.domain` in network data
  - User → `user.name` in authentication and alerts data
- Execute queries with time bounds (`timeWindowDays`, default 30) and result limits (100 per query)
- Batch execution with max 10 concurrent queries
- **Output**: `{ results: Array<{ ioc, type, matchCount, matches: Array<{ index, timestamp, sourceDocument }> }>, summary: string }`
- **Validation**: Maximum 50 IOCs per invocation. Maximum time window 90 days.
- **Confirmation**: `policy: 'always'` (hunting queries may be resource-intensive)

#### Scenario: Hunt for a malicious IP across the environment

- **WHEN** the agent calls `security.hunt_iocs` with `{ iocs: [{ type: "ipv4", value: "185.220.101.42" }], timeWindowDays: 14 }`
- **THEN** the tool generates ES|QL queries searching `source.ip` and `destination.ip` across logs and alerts, returns matching documents with timestamps and context

#### Scenario: Hunt for multiple IOC types

- **WHEN** the agent calls `security.hunt_iocs` with IOCs containing IPs, hashes, and domains
- **THEN** the tool generates type-specific queries for each, executes them in batches, and returns aggregated results

#### Scenario: Too many IOCs provided

- **WHEN** the agent calls `security.hunt_iocs` with more than 50 IOCs
- **THEN** the tool rejects with: "Maximum 50 IOCs per invocation. Split into multiple calls."

#### Scenario: No matches found

- **WHEN** the agent calls `security.hunt_iocs` and no documents match any IOC
- **THEN** the tool returns `{ results: [...], summary: "No matches found for {N} IOCs in the last {timeWindowDays} days" }` with zero match counts

---

### Requirement: Hunt-from-case skill extracts IOCs and runs a sweep

The system SHALL provide a skill `hunt-from-case` registered in the Security Solution plugin. The skill SHALL instruct the agent to:

1. **Extract IOCs**: Read the case (alerts + comments) and extract IOCs from structured alert fields: IPs from `source.ip`/`destination.ip`, hashes from `process.hash.sha256`/`file.hash.sha256`, domains from `dns.question.name`/`url.domain`, user names from `user.name`
2. **Deduplicate and filter**: Remove known-benign indicators (internal RFC1918 IPs, localhost, common infrastructure)
3. **Run IOC sweep**: Call `security.hunt_iocs` with the extracted IOCs
4. **Analyze findings**: For each IOC with matches, assess whether the matches represent new compromised assets
5. **Update the case**: Add a "Threat Hunting Results" comment to the case listing IOCs swept, matches found, and newly identified affected assets
6. **Register observables**: Add newly discovered IOCs as case observables using `platform.core.cases.add_observable`
7. **Create follow-up cases**: If new affected assets are discovered that aren't part of any existing case, offer to create new cases for them

The skill's `getAllowedTools()` SHALL return: `['platform.core.cases', 'platform.core.cases.add_comment', 'platform.core.cases.add_observable', 'security.hunt_iocs', 'security.alerts', 'security.entity_risk_score']`.

#### Scenario: IOC sweep finds additional affected hosts

- **WHEN** the agent runs `hunt-from-case` on a case, extracts 5 IOCs, and the sweep finds 3 additional hosts communicating with a malicious IP
- **THEN** the agent adds a threat hunting report to the case, registers the IOCs as observables, and offers to create follow-up cases for the newly discovered hosts

#### Scenario: No new findings from sweep

- **WHEN** the IOC sweep returns no matches outside the original case
- **THEN** the agent reports: "Threat hunting sweep complete. No additional affected assets found. Blast radius appears contained to the hosts in this case."

---

### Requirement: Observable extraction tool adds IOCs to case observables

The system SHALL provide a built-in tool `platform.core.cases.add_observable` registered in `agent_builder_platform`. The tool SHALL:

- **Input**: `{ caseId: string, observable: { typeKey: string, value: string, description?: string } }` where `typeKey` is one of the supported Cases observable types (e.g., `'ipv4'`, `'ipv6'`, `'sha256'`, `'sha1'`, `'md5'`, `'domain'`, `'url'`)
- **Behavior**: Call `CasesClient.addObservable()` to register the observable. Check for duplicates before adding.
- **Confirmation**: `policy: 'always'`
- **Output**: `{ success: boolean, observableId: string, totalObservables: number }`

#### Scenario: Add an IP observable to a case

- **WHEN** the agent calls `platform.core.cases.add_observable` with `{ caseId: "abc-123", observable: { typeKey: "ipv4", value: "185.220.101.42", description: "C2 server identified during investigation" } }`
- **THEN** the system adds the observable to the case and returns the observable ID

#### Scenario: Duplicate observable rejected

- **WHEN** the agent calls `add_observable` with an IOC that already exists as an observable on the case
- **THEN** the tool returns: "Observable already exists on case: {typeKey}:{value}"

#### Scenario: Invalid observable type

- **WHEN** the agent calls `add_observable` with an unsupported `typeKey`
- **THEN** the tool schema validation rejects the call
