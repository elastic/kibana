# Kibana TeamCity

## Implemented so far

- Project configuration with ability to provide configuration values that are unique per TeamCity instance (e.g. dev vs prod)
- Read-only configuration (no editing through the UI)
- Secrets stored in TeamCity outside of source control
- Setting secret environment variables (they get filtered from console if output on accident)
- GCP agent configurations
  - One-time use agents
  - Multiple agents configured, of different sizes (cpu, memory)
  - Require specific agents per build configuration
- Unit testable DSL code
- Build artifact generation and consumption
- DSL Extensions of various kinds to easily share common configuration between build configurations in the same repo
- Barebones Slack notifications via plugin
- Dynamically creating environment variables / secrets at runtime for subsequent steps
- "Baseline CI" job that runs a subset of CI for every commit
- "Full CI" job that runs full CI hourly, if changes are detected. Re-uses builds that ran during "Baseline CI" for same commit
- Performance monitoring enabled for all jobs

## Kibana Builds

### Baseline CI

### Full CI

So far:

![Diagram](Kibana.png)

### ES Snapshot Verification

Not yet implemented. Notes in progress.

Build Configurations:

- Build Elasticsearch Snapshot
- Test Builds (e.g. OSS CI Group 1, Default CI Group 3, etc)
- Verify Elasticsearch Snapshot - Composite build
- Promote Elasticsearch Snapshot

Desires:

- Build ES snapshot on a daily basis, run E2E tests against it, promote when successful
- Ability to easily promote old builds that have been verified
- Ability to run verification without promoting it

#### Build Elasticsearch Snapshot

- checks out both Kibana and ES codebases
- builds ES artifacts
- uses scripts from Kibana repo to create JSON manifest and assemble snapshot files
- uploads artifacts to GCS
- sets parameters via service message that contains the snapshot URL, ID, version so they can be consumed by downstream jobs
- triggers on timer, once per day

#### Test Builds

- builds will probably need to be copies of the "essential ci" versions
- artifact/snapshot deps on oss/default builds
  - Use latest already built build artifact and sync sources with build job if possible - no need to use absolute latest
- snapshot dependency on `Build Elasticsearch Snapshot`, don't synchronize revisions
- set `env.ES_SNAPSHOT_MANIFEST` = `dep.<BUILD_ES_BUILD_ID>.ES_SNAPSHOT_MANIFEST_URL`

#### Verify Elasticsearch Snapshot

- composite build
- contains all of the CI Groups and such

#### Promote Elasticsearch Snapshot

- snapshot dependency on `Verify Elasticsearch Snapshot`
- uses scripts from Kibana repo to promote elasticsearch snapshot from `Verify Elasticsearch Snapshot`
- daily trigger
