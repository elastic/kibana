# Examples & Edge Cases

Real-world examples from cloud audit logs showing field mappings and graph results.

## Example 1: AWS CloudTrail — User Console Login

Single user actor, generic target.

```json
{
  "event.action": "ConsoleLogin",
  "user.entity.id": ["arn:aws:iam::704479110758:user/dmitry.gurevich@elastic.co"],
  "entity.target.id": ["704479110758"]
}
```

- **Actor**: `user.entity.id` (priority 1)
- **Target**: AWS Account ID via `entity.target.id` (not a user/host/service, so generic)

## Example 2: GCP Audit Logs — Service Account List Assets

Multiple service actors, generic target.

```json
{
  "event.action": "google.cloud.asset.v1.AssetService.ListAssets",
  "service.entity.id": [
    "elastic-agent-cspm-user-sa@elastic-security-test.iam.gserviceaccount.com",
    "asset-inventory-ci-tests-sa@elastic-security-test.iam.gserviceaccount.com"
  ],
  "entity.target.id": ["projects/439975565995"]
}
```

- **Actor**: `service.entity.id` (no user/host present)
- Service accounts grouped together in the graph

## Example 3: GCP Audit Logs — Bulk operation on multiple hosts

Single service actor, multiple host targets.

```json
{
  "event.action": "google.cloud.compute.v1.Instances.BulkSetLabels",
  "service.entity.id": "taggingcleanup-svc-account@elastic-platform-capacity.iam.gserviceaccount.com",
  "host.target.entity.id": [
    "projects/elastic-security-test/zones/us-central1-c/instances/web-server-01",
    "projects/elastic-security-test/zones/us-central1-c/instances/web-server-02",
    "projects/elastic-security-test/zones/us-central1-f/instances/api-server-01"
  ]
}
```

- All three targets displayed as grouped node unless enriched differently
- Shows blast radius of automated operations

## Example 4: AWS CloudTrail — AssumeRole with entity enrichment

```json
{
  "event.action": "AssumeRole",
  "user.entity.id": "arn:aws:iam::704479110758:role/ScannerInstanceRole-cT48cnlu1lqh",
  "user.target.entity.id": "arn:aws:iam::704479110758:role/DatadogAgentlessScannerDelegateRole"
}
```

- Actor and target nodes enriched with entity store data (type and icon)

## Example 5: Multiple actors, single target (with filter)

```json
{
  "event.action": "DescribeVpcs",
  "user.entity.id": "arn:aws:iam::704479110758:user/serverless_ci",
  "user.target.entity.id": "704479110758"
}
```

With filter `{ "event.action": "DescribeVpcs" }`, multiple actors that performed the same action are shown. Some grouped together with entity store enrichment (name and type).

## Edge cases

### Both user and service entities as actors

```json
{
  "user.entity.id": ["user@company.com"],
  "service.entity.id": ["github-ci-service-account"],
  "host.target.entity.id": ["github-ci-host"],
  "event.action": "Authenticate"
}
```

**Resolution**: `user.entity.id` wins (priority 1). Service entity is ignored for actor selection.

### Missing target field

```json
{
  "user.entity.id": ["analyst@company.com"],
  "event.action": "DescribeInstances"
}
```

**Resolution**: Event does **not** render — missing required target field.
