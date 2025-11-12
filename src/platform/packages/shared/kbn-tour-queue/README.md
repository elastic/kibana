# @kbn/tour-queue

# Tour Queue

A global queue mechanism for managing sequential tour display across Kibana plugins.

## Tour Priority Table

| Priority | Tour ID | Description |
|----------|---------|-------------|
| 1 | `solutionNavigationTour` | Solution navigation tour (Navigation plugin) |
| 2 | `siemMigrationSetupTour` | Security SIEM migration setup (Security plugin) |

**Note:** Lower priority = shown first. If a tour calls `onSkip()`, all remaining tours are skipped. Currently, only the navigation tour implements skip functionality.
