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

## Kibana Builds

### Essential CI

So far:

![Diagram](Kibana.png)
