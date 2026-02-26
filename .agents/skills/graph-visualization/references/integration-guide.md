## Overview

The Security Investigation Graph is a powerful visualization feature in Elastic Security that helps analysts understand complex security events by representing them as interactive node-and-edge graphs. This guide provides technical requirements for integration developers to enable graph visualization support in their integrations.

### What is Graph Visualization?

Graph visualization transforms security events into visual representations where:

- **Nodes** represent entities (users, hosts, services, infrastructure, etc.)
- **Edges** represent actions between entities
- **Interactive exploration** allows analysts to pivot through connected events and discover related security activity

### The Actor-Action-Target Model

Security events in the graph follow an actor-action-target model:

- **Actor**: The entity that initiates or performs an action (e.g., a user logging in, a service assumes a role)
- **Action**: The operation or activity performed (e.g., "user login", "file access", "API request")
- **Target**: The entity or entities affected by the action (e.g., an application, a resource, a database)

This model enables analysts to:

- Trace the flow of activity across their environment
- Identify anomalous patterns and lateral movement
- Correlate events across multiple data sources

**Example**: When a user (`actor`) authenticates (`action`) to an application (`target`), the graph displays three nodes connected by directional edges showing the action flow.

### Value for Security Teams

Enabling graph visualization in your integration provides:

- **Enhanced investigation workflows**: Analysts can visually explore events from your integration alongside other security data
- **Faster threat detection**: Visual patterns make it easier to spot suspicious activity
- **Cross-source correlation**: Your integration's events can be connected with events from other sources in the same graph
- **Improved user experience**: Native graph support in Elastic Security's investigation workflows

### Access Graph Visualization

Graph visualization is available across multiple locations in Elastic Security. The visibility depends on specific fields being present in the event or alert:

| Location                           | Required Field(s)                        | Navigation Path              |
| ---------------------------------- | ---------------------------------------- | ---------------------------- |
| **Events Flyout (Hosts events)**   | `host.name`                              | Security → Explore → Hosts   |
| **Events Flyout (Users events)**   | `user.name`                              | Security → Explore → Users   |
| **Events Flyout (Network events)** | `source.ip` or `destination.ip`          | Security → Explore → Network |
| **Alerts Flyout**                  | (any alert with actor and target fields) | Security → Alerts            |

**How to access:**

1. **Hosts -> Events Flyout**

   - Navigate to **Security** → **Explore** → **Hosts**
   - Expand an event to open the flyout
   - Graph Preview appears under the **Visualizations** section

2. **Users -> Events Flyout**

   - Navigate to **Security** → **Explore** → **Users**
   - Expand an event to open the flyout
   - Graph Preview appears under the **Visualizations** section

3. **Network -> Events Flyout**

   - Navigate to **Security** → **Explore** → **Network**
   - Expand an event to open the flyout
   - Graph Preview appears under the **Visualizations** section

4. **Alerts -> Alerts Flyout**
   - Navigate to **Security** → **Alerts**
   - Expand an alert to open the flyout
   - Graph Preview appears under the **Visualizations** section

**Note**: In all locations, graph visualization will only render if the underlying event also contains the required [actor and target entity fields](#1-required-index-mappings) for graph rendering.

## Prerequisites

Before implementing graph visualization support, ensure you have the following in place:

### License Requirements

Graph Visualization requires specific license tiers depending on your deployment type:

- **ESS/Self-Managed**: Platinum license or higher (Platinum, Enterprise, or Trial)
- **Serverless**: Security Analytics Complete tier (not available in Essentials tier)

The feature will not be available if the required license tier is not met.

### 1. Required Index Mappings

Your integration's `logs-*` index must contain mappings for entity fields to enable graph visualization:

**Actor and target field mappings:**

- `*.entity.id` - For actor identification (e.g., `user.entity.id`, `host.entity.id`, `service.entity.id`)
- `*.target.entity.id` - For target identification (e.g., `user.target.entity.id`, `host.target.entity.id`, `service.target.entity.id`)
- `entity.id` and `entity.target.id` - Generic entity fields as fallback

**Required fields:**

1. **Actor fields** - At least one entity field identifying who/what performed the action
2. **Action field** - `event.action` describing what happened
3. **Target fields** - At least one entity field identifying what was affected

Detailed field specifications and best practices are covered in the [Technical Requirements](#technical-requirements) section.

### 2. Enhanced Experience with Entity Enrichment (Optional)

For a richer graph visualization experience with entity enrichment from the entity store, the following index pattern should also contain entity mappings:

**Entity store generic index -** `.entities-v1.latest.security_generic_<space-id>` (used by graph visualization to enrich nodes)

When entities are present in the entity store generic index, graph nodes will display enriched information such as:

- **Entity names and descriptions**
- **Entity types and sub-types**
- **IP addresses and country codes**

**Imporant:** Entity enrichment is done if entity with the same id is present in the entity store generic index

**Note**: For cloud provider integrations, entity enrichment requires [Cloud Asset Discovery](#step-5-enable-asset-inventory-optional-but-recommended) to be installed and configured. Other integrations may provide their own entity data directly. The graph will still function without entity enrichment, but nodes will display basic information only.

### Content for More Context

The following resources provide additional background on graph visualization concepts and architecture:

#### ECS Entity Field Set

The graph visualization feature aligns with the [ECS Entity Field Set](https://www.elastic.co/docs/reference/ecs/ecs-entity). These fields standardize how entities are represented across the Elastic ecosystem.

**Key concepts**:

- Entity fields are nested under existing ECS field sets (e.g., `user.entity.*`, `host.entity.*`)
- Each entity type has dedicated fields for identification, classification, and metadata
- Target entities use the `.target.*` namespace (e.g., `user.target.entity.id`, `host.target.entity.id`)

#### Related Resources

- [[Epic] Logic for visualizing audit logs in graph viz](https://github.com/elastic/security-team/issues/10658) - Technical discussion on field mapping decisions
- [ECS Entity Field Set RFC](https://github.com/elastic/ecs/blob/main/rfcs/text/0049-entity-fields.md) - Official ECS specification
- [ECS Entity field Set](https://www.elastic.co/docs/reference/ecs/ecs-entity) - ECS Entity field set documentation
- [Generic entity discussion](https://github.com/elastic/ecs/issues/2559) - Discussion on the generic entity namespace

#### Workflow Overview

The graph preview and visualization are presented for events that include all required fields. The system will:

1. Resolve the actor using priority-based logic (covered in [Actor Resolution Logic](#actor-resolution-logic)).
2. Identify all targets from `*.target.entity.id`/`entity.target.id` fields (covered in [Target Population Rules](#target-population-rules)).
3. Extract additional entity metadata from the entity store to enrich node visualization (covered in [Entity Enrichment](#2-enhanced-experience-with-entity-enrichment-optional)).
4. Render the graph with proper node shapes, icons, and connections.

## Technical Requirements

### Required Fields

The following fields are required for events to render in the graph visualization:

| Field                                                                                                        | Mapping   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Importance |
| ------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `user.entity.id`<br/>`host.entity.id`<br/>`service.entity.id`<br/>or `entity.id`                             | `keyword` | **Actor identification**: A unique identifier for the entity performing the action. `user.entity.id`, `host.entity.id`, `service.entity.id` when the entity has a dedicated ECS field set and the generic `entity.id` if there is no specific classification. More entity types may be supported in the future depending on root-level ECS classifications. See [Actor Resolution Logic](#actor-resolution-logic) below for priority details.                                       | Must Have  |
| `event.action`                                                                                               | `keyword` | **Action description**: Describes the operation or activity performed by the actor on the target. Should be specific and meaningful for security investigations (e.g., "user-login", "file-access", "api-request", "resource-created"). See [ECS event.action](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-action) for guidelines.                                                                                                                       | Must Have  |
| `user.target.entity.id`<br/>`host.target.entity.id`<br/>`service.target.entity.id`<br/>or `entity.target.id` | `keyword` | **Target identification**: A unique identifier for the entity or entities affected by the action. Use the entity-specific target field (`user.target.entity.id`, `host.target.entity.id`, `service.target.entity.id`) when the target has a dedicated ECS field set. Use the generic `entity.target.id` if there is no specific classification. Multiple targets are supported - all will be displayed in the graph. See [Target Population Rules](#target-population-rules) below. | Must Have  |

**Note**: At minimum, you must provide at least one actor field, the `event.action` field, and at least one target field for an event to render in the graph.

### Actor Resolution Logic

When an event contains multiple entity fields, the graph visualization uses **priority-based resolution** to identify a single actor:

| Priority | Field               | Description                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| 1        | `user.entity.id`    | If present, this is selected as the actor (highest priority)                         |
| 2        | `host.entity.id`    | If present and no user entity exists, this is selected as the actor                  |
| 3        | `service.entity.id` | If present and no user/host entity exists, this is selected as the actor             |
| 4        | `entity.id`         | If present and no other entity types exist, this is selected as the actor (fallback) |

**Important notes:**

- **Only one actor field per event is supported**: The system selects a single actor using the priority order above and stops at the first match (actor field could have multiple values)
- **Consistent selection**: When multiple entity types are present in an event, user entities always take precedence, followed by host, service, and generic entities
- **Security-first priority**: User actors are prioritized because they typically represent the most critical security context

**Example**: If an event contains both `user.entity.id` and `host.entity.id`, the user will be selected as the actor.

### Target Population Rules

Unlike actor resolution, **target identification includes all target entities** found in an event:

- **No priority ordering**: All supported `*.target.entity.id` fields are evaluated simultaneously
- **Multiple targets supported**: The graph will display edges to all discovered targets
- **All targets equally represented**: There is no hierarchy among different target entity types

**Supported target fields:**

- `user.target.entity.id`
- `host.target.entity.id`
- `service.target.entity.id`
- `entity.target.id`

**Example**: If an event contains `user.target.entity.id`, `host.target.entity.id`, and `service.target.entity.id`, the graph will show the actor connected to all three target entities.

## Examples

This section provides real-world examples from cloud audit logs showing how to properly map fields for graph visualization support.

### Example 1: AWS CloudTrail - User Console Login

This example shows a user authentication event where a user logs into the AWS console.

**Event Type**: User authentication to AWS account
**Actor Type**: User (IAM user)
**Target Type**: AWS Account (generic entity)

**Key field mappings:**

```json
{
  "@timestamp": "2025-10-23T11:04:29.000Z",
  "event.action": "ConsoleLogin",
  "user.entity.id": ["arn:aws:iam::704479110758:user/dmitry.gurevich@elastic.co"],
  "user.id": "AIDA2IBR2EZTLPSZLYF4Y",
  "entity.target.id": ["704479110758"]
}
```

**Graph visualization result:**

- **Actor**: User entity (`user.entity.id` takes priority)
- **Action**: "ConsoleLogin"
- **Target**: AWS Account ID (via `entity.target.id` since the account is not a user/host/service)

<DocImage
  size="xl"
  url="assets/graph-visualization-example-1.png"
  caption="User Console Login event"
/>

**Notes:**

- The AWS ARN is used as the stable entity identifier for the user
- The AWS account ID is a generic entity (no specific type), so it uses `entity.target.id`
- No entity enrichment is used in this example

### Example 2: GCP Audit Logs - Service Account List Assets

This example shows a service account modifying IAM policies on a GCP project.

**Event Type**: IAM policy modification
**Actor Type**: Service (service account)
**Target Type**: GCP Project (generic entity)

**Key field mappings:**

```json
{
  "@timestamp": "2025-11-19T04:55:08.248Z",
  "event.action": "google.cloud.asset.v1.AssetService.ListAssets",
  "service.entity.id": [
    "elastic-agent-cspm-user-sa@elastic-security-test.iam.gserviceaccount.com",
    "asset-inventory-ci-tests-sa@elastic-security-test.iam.gserviceaccount.com"
  ],
  "entity.target.id": ["projects/439975565995"]
}
```

**Graph visualization result:**

- **Actor**: Service account entity (`service.entity.id` is selected since no `user.entity.id` or `host.entity.id` exists)
- **Action**: "google.cloud.asset.v1.AssetService.ListAssets"
- **Target**: GCP Project (via `entity.target.id`)

<DocImage
  size="xl"
  url="assets/graph-visualization-example-2.png"
  caption="Service Account List Assets event"
/>

**Notes:**

- The GCP project uses the generic `entity.target.id` field
- Service accounts are treated as service entities, taking priority over generic entities but after users and hosts
- Service accounts are grouped together and their details are shown in the entities panel
- No entity enrichment is used in this example

### Example 3: GCP Audit Logs - Service Account Acting on Multiple Instances

This example demonstrates how to handle events where a single actor affects multiple targets.

**Event Type**: Bulk infrastructure modification
**Actor Type**: Service (service account)
**Target Type**: Multiple hosts (GCE instances)

**Key field mappings:**

```json
{
  "@timestamp": "2025-11-27T02:34:46.049Z",
  "event.action": "google.cloud.compute.v1.Instances.BulkSetLabels",
  "service.entity.id": "taggingcleanup-svc-account@elastic-platform-capacity.iam.gserviceaccount.com",
  "service.name": "compute.googleapis.com",

  "host.target.entity.id": [
    "projects/elastic-security-test/zones/us-central1-c/instances/web-server-01",
    "projects/elastic-security-test/zones/us-central1-c/instances/web-server-02",
    "projects/elastic-security-test/zones/us-central1-f/instances/api-server-01"
  ]
}
```

**Graph visualization result:**

- **Actor**: Service account entity (via `service.entity.id`)
- **Action**: "google.cloud.compute.v1.Instances.BulkSetLabelsabels"
- **Targets**: Three GCE instances (all via `host.target.entity.id`)

<DocImage
  size="xl"
  url="assets/graph-visualization-example-3.png"
  caption="Service Account Acting on Multiple Instances event"
/>

**Notes:**

- All three target instances are displayed as a single grouped node unless enriched by different entities.
- Each instance gets its own edge from the actor, showing the complete scope of the bulk operation
- This pattern is valuable for security analysts to quickly identify the blast radius of automated operations

### Example 4: AWS CloudTrail - User Assumes Role with entity enrichment

This example shows a user assumes a role where the entity enrichment is used to enrich the actor and target nodes.

**Event Type**: User assumes role (AssumeRole)
**Actor Type**: IAM role (User)
**Target Type**: role session (IAM role)

**Key field mappings:**

```json
{
  "@timestamp": "2025-08-06T02:34:46.049Z",
  "event.action": "AssumeRole",
  "user.entity.id": "arn:aws:iam::704479110758:role/tin-datadog-demo-try-2-DatadogA-ScannerInstanceRole-cT48cnlu1lqh",
  "user.target.entity.id": "arn:aws:iam::704479110758:role/DatadogAgentlessScannerDelegateRole"
}
```

**Graph visualization result:**

- **Actor**: IAM role entity (via `user.entity.id`)
- **Action**: "AssumeRole"
- **Targets**: IAM role session (via `user.target.entity.id`)

<DocImage
  size="xl"
  url="assets/graph-visualization-example-4.png"
  caption="User Assumes Role event with entity enrichment"
/>

**Notes:**

- Actor and target nodes are enriched with the entity details from the entity store (type and icon)

### Example 5: AWS CloudTrail - Advanced Case - Multiple Actors and single Target

This example shows a IAM user which is used by ci/ci pipeline to perform action (Describe VPC) on a AWS resource.
In adition - there is a filter which is applied to show all actors that performed the same action (Describe VPC).

**Event Type**: Describe VPC (DescribeVpcs)
**Actor Type**: IAM users
**Target Type**: VPC (AWS resource)

**Key field mappings:**

```json
{
  "@timestamp": "2025-12-09T02:34:46.049Z",
  "event.action": "DescribeVpcs",
  "user.entity.id": "arn:aws:iam::704479110758:user/serverless_ci",
  "user.target.entity.id": "704479110758"
}
```

filter:

```
{
  "event.action": "DescribeVpcs",
}
```

<DocImage
  size="xl"
  url="assets/graph-visualization-example-5.png"
  caption="Describe VPC event with multiple actors and single target"
/>

**Notes:**

- Some actors are grouped together and their details are shown in the entities panel
- the top entity node is grouped (3 IAM users) and enriched with the entity details from the entity store (name and type)

### Edge Cases and Solutions

#### Edge Case 1: Event Contains Both User and Service Entities as Actors

**Scenario**: A user authenticates through a service account.

```json
{
  "user.entity.id": ["user@company.com"],
  "service.entity.id": ["github-ci-service-account"],
  "host.target.entity.id": ["github-ci-host"],
  "event.action": "Authenticate"
}
```

**Resolution**: The `user.entity.id` is selected as the actor (priority 1).

#### Edge Case 2: Missing Target Field

**Scenario**: Some events have no clear target (e.g., query operations, read-only actions).

```json
{
  "user.entity.id": ["analyst@company.com"],
  "event.action": "DescribeInstances"
}
```

**Resolution**: The event will **not** render in the graph visualization as it lacks a required target field.

## Testing & Validation

This section provides guidance on verifying graph visualization compatibility, troubleshooting common issues, and optimizing performance.

### How to Verify Graph Compatibility

Follow these steps to verify that your integration will work with graph visualization.

#### Prerequisites

Before testing, ensure you have the following minimum versions:

| Component                  | Minimum Version | Notes                                    |
| -------------------------- | --------------- | ---------------------------------------- |
| Elastic Stack              | 9.3.0           | Required for graph visualization feature |
| AWS CloudTrail integration | 4.6.0           | If testing with AWS data                 |
| GCP Audit Logs integration | 2.46.0          | If testing with GCP data                 |

**Currently supported integrations:**

- AWS CloudTrail (`aws.cloudtrail`)
- GCP Audit Logs (`gcp.audit`)

**Note**: Any integration that generates events with at least one ECS-compatible actor field and target field should be compatible with graph visualization, even if not explicitly listed above.

#### Step 1: Enable Graph Visualization Feature

Graph visualization is currently behind a feature flag (Enabled by default from 9.3.0). To enable it in Kibana:

1. Navigate to **Stack Management** → **Advanced Settings**
2. Search for `securitySolution:enableGraphVisualization`
3. Toggle the setting to **ON**
4. Save the changes

#### Step 2: Verify Field Mappings

Check that your integration populates the required fields. Run a query in Discover or Dev Tools to verify:

**Verification checklist:**

- [ ] At least one actor field is populated (`user.entity.id`, `host.entity.id`, `service.entity.id`, or `entity.id`)
- [ ] `event.action` field is populated with a meaningful value
- [ ] At least one target field is populated (`*.target.entity.id` or `entity.target.id`)
- [ ] (Optional but recommended) `related.entity` array contains all entity IDs

#### Step 3: Access Graph Visualization

See [Access Graph Visualization](#access-graph-visualization) in the Overview section for detailed information on where graph visualization appears and how to access it from different locations (Events Flyout and Alerts Flyout).

**Expected result:** If your integration's events have the required fields, you should see:

- Graph preview with actor and target nodes under the **Visualizations** section
- Action edges connecting the nodes
- Interactive graph that allows expanding and exploring connected events

#### Step 4: Test with Sample Events (Optional)

This step is optional and useful if your integration is not yet installed but you want to test graph visualization capabilities with sample data.

Create test events to verify different scenarios:

**Test Case 1: Single Actor, Single Target**

```json
POST /logs-test-integration-default/_doc
{
  "@timestamp": "2025-11-30T10:00:00.000Z",
  "user.entity.id": ["test-user@example.com"],
  "event.action": "TestAction",
  "entity.target.id": ["test-resource-123"],
  "related.entity": ["test-user@example.com", "test-resource-123"]
}
```

**Test Case 2: Service Actor, Host Target**

```json
POST /logs-test-integration-default/_doc
{
  "@timestamp": "2025-11-30T10:00:00.000Z",
  "service.entity.id": ["test-service-account"],
  "event.action": "ModifyInstance",
  "host.target.entity.id": ["instance-456"],
  "related.entity": ["test-service-account", "instance-456"]
}
```

**Test Case 3: Multiple Targets**

```json
POST /logs-test-integration-default/_doc
{
  "@timestamp": "2025-11-30T10:00:00.000Z",
  "user.entity.id": ["admin@example.com"],
  "event.action": "BulkDelete",
  "entity.target.id": ["resource-1", "resource-2", "resource-3"],
  "related.entity": ["admin@example.com", "resource-1", "resource-2", "resource-3"]
}
```

Verify that each test case renders correctly in the graph visualization.

#### Step 5: Enable Asset Inventory (Optional but Recommended)

For an optimal and enriched graph experience, enable Cloud Asset Inventory:

1. **Enable Asset Inventory in Advanced Settings:**

   - Navigate to **Stack Management** → **Advanced Settings**
   - Search for `securitySolution:enableAssetInventory`
   - Toggle the setting to **ON**
   - Save the changes

2. **Enable Asset Inventory:**

   - Navigate to **Security** → **inventory**
   - Click on **Enable Asset Inventory** - this would create the necessary indexes, enrich policies and data views.

3. **Install Cloud Asset Discovery Integration:**
   - Navigate to **Integrations**
   - Search for **Cloud Asset Discovery**
   - Install the **Cloud Asset Discovery** integration
   - Configure asset discovery for your cloud provider (AWS, GCP, or Azure)

**Benefits of Asset Inventory:**

- Enhanced node visualization with additional entity metadata
- Richer context (entity name, entity type, entity sub type, etc.)
- Better entity resolution and deduplication
- Visual indicators for entity classification

**Note**: Graph visualization works without Asset Inventory, but entities will display with basic information only.

#### Verification Checklist

Use this checklist to confirm your integration is fully compatible:

- [ ] **Stack Version**: Running Elastic Stack 9.3.0 or later
- [ ] **Integration Version**: Using minimum required integration version
- [ ] **Feature Flag**: `securitySolution:enableGraphVisualization` is enabled
- [ ] **Field Mappings**: Events contain required actor, action, and target fields
- [ ] **Field Priorities**: Entity-specific fields are used when entity type is known
- [ ] **Graph Access**: Graph tab/preview appears in flyouts
- [ ] **Graph Rendering**: Nodes and edges display correctly
- [ ] **Asset Inventory**: (Optional) Enabled for enhanced experience

### Common Issues and Troubleshooting

This section covers common issues you may encounter when implementing or testing graph visualization support.

### Issue 1: Graph Not Displayed for Events with Actor and Target Fields

**Symptom**: You open an event or alert that contains actor and target fields, but the graph visualization does not appear.

**Cause**: The graph visualization feature flag is not enabled.

**Solution**:

1. Navigate to **Stack Management** → **Advanced Settings**
2. Search for `securitySolution:enableGraphVisualization`
3. Verify the setting is toggled **ON**
4. If it was OFF, toggle it to ON and save
5. Refresh your browser and try accessing the graph again

**Verification**: After enabling the feature flag, you should see a **Graph** tab or **Visualizations** section when opening events or alerts with compatible fields.

### Issue 2: Graph Nodes Display Without Enrichment Data

**Symptom**: Graph nodes are displayed but lack enrichment data such as:

- IP addresses
- Country codes
- Entity types and sub-types
- Entity names
- Other contextual metadata

**Cause**: Cloud Asset Discovery integration is not installed, or the specific entity has not been discovered/enriched.

**Solution**:

**First, ensure Cloud Asset Discovery is installed:**

1. Navigate to **Integrations**
2. Search for **Cloud Asset Discovery**
3. If not installed, install and configure it for your cloud provider
4. Wait for asset discovery to complete (initial sync may take some time)

**If integration is installed but specific nodes are not enriched, debug as follows:**

**Step 1: Identify the Entity ID**

1. Open the alerts/events flyout
2. Navigate to the **Table** tab
3. Search for the appropriate entity ID field:
   - **For actor nodes** (entity that performed the action):
     - `user.entity.id`
     - `host.entity.id`
     - `service.entity.id`
     - `entity.id`
   - **For target nodes** (entity that action was performed on):
     - `user.target.entity.id`
     - `host.target.entity.id`
     - `service.target.entity.id`
     - `entity.target.id`
4. Copy the entity ID value

**Step 2: Check Entity Store**

1. Open **Discover**
2. Create a data view with pattern: `entities-generic-latest`
3. Create a query: `entity.id: "<copied-id>"`
   - Replace `<copied-id>` with the entity ID from Step 1
4. Execute the search

**Step 3: Interpret Results**

- **Entity Found**: The entity exists in the store but enrichment data may be incomplete. Check the entity document for available fields.
- **Entity Not Found**: The node is not enriched because no matching entity was discovered by Cloud Asset Discovery. This is expected for:
  - External entities (e.g., public IP addresses, external services)
  - Newly created resources that haven't been discovered yet
  - Resources outside the scope of your asset discovery configuration

**Additional Checks**:

- Verify your Cloud Asset Discovery configuration includes the cloud accounts/projects where the entity resides
- Check that asset discovery is running and not encountering errors
- Allow sufficient time for initial asset discovery to complete (can take 15-30 minutes)

### Issue 3: Graph Preview Section Exists But Graph Is Empty

**Symptom**: You see a "Graph preview" or "Visualizations" section when opening an alert or event, but the graph itself is empty or shows no nodes.

**Cause**: The event timestamp is outside the currently selected time range for the graph query.

**Solution**:

1. In the graph preview section, click the **magnifying glass icon** to open the query search bar
2. Locate the date/time range selector
3. Adjust the **start date** and **end date** to include the event timestamp:
   - Expand the time range to cover a broader period (e.g., last 7 days, last 30 days)
   - Or manually set specific dates that include your event's `@timestamp`
4. Click **Apply** or **Search** to re-query with the new time range

**Tips**:

- Check the event's `@timestamp` field to know what time range to use
- For testing, use a wide time range initially (e.g., last 30 days)
- For production, balance between performance and completeness based on your investigation needs

**Example**: If your event occurred on November 15th but your graph time range is set to "Last 24 hours" on November 30th, the graph will be empty. Expand the range to include November 15th.

### Issue 4: Actor Resolution Doesn't Match Expectations

**Symptom**: The wrong entity is selected as the actor when multiple entity types are present.

**Cause**: Not understanding the actor resolution priority order.

**Solution**: Review the [Actor Resolution Logic](#actor-resolution-logic) section. Remember:

- Priority 1: `user.entity.id`
- Priority 2: `host.entity.id`
- Priority 3: `service.entity.id`
- Priority 4: `entity.id`

If you need a different entity to be the actor, ensure only that entity's field is populated, or adjust your field mappings to align with the priority order.

#### Getting Additional Help

If you continue to experience issues:

1. Check the Kibana logs for errors related to graph visualization
2. Verify your Elastic Stack version is 9.3.0 or later
3. Confirm your integration version meets minimum requirements
4. Review the [Verification Checklist](#verification-checklist) to ensure all prerequisites are met
5. Reach out to the Cloud Security team via #cloud-sec Slack channel with:
   - Elastic Stack version
   - Integration name and version
   - Sample event JSON (with sensitive data redacted)
   - Screenshots of the issue
   - Steps you've already tried

### Performance Considerations

Understanding performance characteristics helps you optimize graph visualization for your specific use cases and data volumes.

#### Built-in Performance Safeguards

**Query and Node Limits**: The graph visualization applies two limits to maintain optimal performance:

- **Event/Alert Limit**: Up to **1,000** events or alerts are fetched from the query
- **Node Limit**: Up to **300** nodes are returned in the graph response

This ensures:

- Reasonable investigation scope
- Manageable number of graph elements
- Optimal rendering performance
- Good user experience for security analysts

**What this means**:

- Your query will match and process up to 1,000 events/alerts
- The graph will display up to 300 nodes (fewer nodes than events is common because multiple events can be grouped into the same node)
- This limit ensures the graph remains interactive and responsive

**Best Practice**: If you're hitting the 300 node limit regularly, consider:

- Narrowing the time range to focus on specific periods of interest
- Using filters to target specific actors, targets, or actions
- Breaking large investigations into multiple focused queries

#### Query Performance Optimization

When using the graph query search bar to filter and explore events, several factors can impact query and rendering performance:

##### 1. Time Range Scope

**Impact**: Large time ranges require scanning more data and can slow down queries.

**Recommendations**:

- Start with narrower time ranges (e.g., last 24 hours, last 7 days)
- Expand gradually if needed for your investigation
- Use specific date ranges when you know the incident timeframe

**Example**:

```
✅ Good:  Last 24 hours (fast, focused)
✅ Good:  Last 7 days (reasonable scope)
⚠️  Caution: Last 30 days (may be slow with high event volumes)
❌ Avoid: Last 90 days or more (likely to be slow and hit the 300 event limit)
```

##### 2. Combined Filters

**Impact**: Multiple complex filters applied simultaneously compound performance impact.

**Recommendations**:

- Start with the most selective filter (the one that reduces results most)
- Add additional filters incrementally
- Monitor query performance and adjust as needed

**Example**:

```
✅ Good:  Specific time range + specific actor + specific action
⚠️  Caution: Broad time range + many actions + many entities
```

### Optimization Best Practices

**Start Narrow, Expand as Needed**

- Begin with specific time ranges and filters
- Gradually broaden scope if initial results are insufficient

**Leverage Asset Inventory**

- Entity enrichment doesn't significantly impact query performance
- Provides valuable context without additional query overhead

**Monitor and Adjust**

- If queries are slow, try narrowing filters
- If graph is too sparse, try broadening the time range incrementally
