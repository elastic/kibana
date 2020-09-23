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
- Jobs with multiple VCS roots (Kibana + Elasticsearch)
- GCS uploading using service account key file and gsutil
- Job that has a version string as an "output", rather than an artifact/file, with consumption in a different job
- Clone a list of jobs and modify dependencies/configuration for a second pipeline
- Promote/deploy a built artifact through the UI by selecting previously built artifact (or automatically build a new one and deploy if successful)

## Kibana Builds

### Baseline CI

- Generates baseline metrics needed for PR comparisons
- Only runs OSS and default builds and visual regression tests
- Runs for each commit (each build should build a single commit)

### Full CI

- Runs everything in CI
- Runs hourly, currently only if there are changes since the last run
- Re-uses builds from Baseline CI if they are finished or in-progress

![Diagram](Kibana.png)

### ES Snapshot Verification

Build Configurations:

- Build Snapshot
- Test Builds (e.g. OSS CI Group 1, Default CI Group 3, etc)
- Verify Snapshot
- Promote Snapshot
- Immediately Promote Snapshot

Desires:

- Build ES snapshot on a daily basis, run E2E tests against it, promote when successful
- Ability to easily promote old builds that have been verified
- Ability to run verification without promoting it

#### Build Snapshot

- checks out both Kibana and ES codebases
- builds ES artifacts
- uses scripts from Kibana repo to create JSON manifest and assemble snapshot files
- uploads artifacts to GCS
- sets parameters via service message that contains the snapshot URL, ID, version so they can be consumed by downstream jobs
- triggers on timer, once per day

#### Test Builds

- builds are clones of all "essential ci" functional and integration tests with irrelevant features disabled
  - they are clones because runs of this build and runs of the essential ci versions for the same commit hash mean different things
- snapshot dependency on `Build Elasticsearch Snapshot` is added to clones
- set `env.ES_SNAPSHOT_MANIFEST` = `dep.<BUILD_ES_BUILD_ID>.ES_SNAPSHOT_MANIFEST` to "consume" the built artifact

#### Verify Snapshot

- composite build that contains all of the cloned test builds

#### Promote Snapshot

- snapshot dependency on `Build Snapshot` and `Verify Snapshot`
- uses scripts from Kibana repo to promote elasticsearch snapshot from `Build Snapshot` by updating manifest files in GCS
- triggers whenever a build of `Verify Snapshot` completes successfully

#### Immediately Promote Snapshot

- snapshot dependency only on `Build Snapshot`
- same as `Promote Snapshot` but skips testing
- can only be triggered manually
