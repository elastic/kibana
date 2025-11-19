# @kbn/tour-queue

# Tour Queue

A global queue mechanism for managing sequential tour display across Kibana plugins.

## Tour Order Table

| Order | Tour ID | Description |
|----------|---------|-------------|
| 1 | `solutionNavigationTour` | Solution navigation tour (Navigation plugin) |
| 2 | `siemMigrationSetupTour` | Security SIEM migration setup (Security plugin) |

**Note:** Lower order = shown first. If a tour is skipped, all remaining tours are skipped for the current page load only. Currently, only the navigation tour implements skip functionality.
