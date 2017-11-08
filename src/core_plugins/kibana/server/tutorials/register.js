import { systemLogsSpecProvider } from './systemLogs';
import { systemMetricsSpecProvider } from './systemMetrics';
import { apacheLogsSpecProvider } from './apacheLogs';
import { apacheMetricsSpecProvider } from './apacheMetrics';
import { nginxLogsSpecProvider } from './nginxLogs';
import { nginxMetricsSpecProvider } from './nginxMetrics';
import { mysqlLogsSpecProvider } from './mysqlLogs';
import { mysqlMetricsSpecProvider } from './mysqlMetrics';

export function registerTutorials(server) {
  server.registerTutorial(systemLogsSpecProvider);
  server.registerTutorial(systemMetricsSpecProvider);
  server.registerTutorial(apacheLogsSpecProvider);
  server.registerTutorial(apacheMetricsSpecProvider);
  server.registerTutorial(nginxLogsSpecProvider);
  server.registerTutorial(nginxMetricsSpecProvider);
  server.registerTutorial(mysqlLogsSpecProvider);
  server.registerTutorial(mysqlMetricsSpecProvider);
}
