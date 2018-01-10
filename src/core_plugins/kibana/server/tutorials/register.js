import { systemLogsSpecProvider } from './system_logs';
import { systemMetricsSpecProvider } from './system_metrics';
import { apacheLogsSpecProvider } from './apache_logs';
import { apacheMetricsSpecProvider } from './apache_metrics';
import { nginxLogsSpecProvider } from './nginx_logs';
import { nginxMetricsSpecProvider } from './nginx_metrics';
import { mysqlLogsSpecProvider } from './mysql_logs';
import { mysqlMetricsSpecProvider } from './mysql_metrics';
import { netflowSpecProvider } from './netflow';

export function registerTutorials(server) {
  server.registerTutorial(systemLogsSpecProvider);
  server.registerTutorial(systemMetricsSpecProvider);
  server.registerTutorial(apacheLogsSpecProvider);
  server.registerTutorial(apacheMetricsSpecProvider);
  server.registerTutorial(nginxLogsSpecProvider);
  server.registerTutorial(nginxMetricsSpecProvider);
  server.registerTutorial(mysqlLogsSpecProvider);
  server.registerTutorial(mysqlMetricsSpecProvider);
  server.registerTutorial(netflowSpecProvider);
}
