# Kibana CI Stats reporter

We're working on building a new service, the Kibana CI Stats service, which will collect information about CI runs and metrics produced while testing Kibana, and then provide tools for reporting on those metrics in specific PRs and overall as a way to spot trends.

### `CiStatsReporter`

This class integrates with the `ciStats.trackBuild {}` Jenkins Pipeline function, consuming the `KIBANA_CI_STATS_CONFIG` variable produced by that wrapper, and then allowing test code to report stats to the service.

To create an instance of the reporter, import the class and call `CiStatsReporter.fromEnv(log)` (passing it a tooling log).

#### `CiStatsReporter#metric(name: string, subName: string, value: number)`

Use this method to record metrics in the Kibana CI Stats service.

Example:

```ts
import { CiStatsReporter, ToolingLog } from '@kbn/dev-utils';

const log = new ToolingLog(...);
const reporter = CiStatsReporter.fromEnv(log)
reporter.metric('Build speed', specificBuildName, timeToRunBuild)
```