import { systemLogsSpecProvider } from './system_logs';
import { systemMetricsSpecProvider } from './system_metrics';
import { apacheLogsSpecProvider } from './apache_logs';
import { apacheMetricsSpecProvider } from './apache_metrics';
import { nginxLogsSpecProvider } from './nginx_logs';
import { nginxMetricsSpecProvider } from './nginx_metrics';
import { mysqlLogsSpecProvider } from './mysql_logs';
import { mysqlMetricsSpecProvider } from './mysql_metrics';
import { redisLogsSpecProvider } from './redis_logs';
import { redisMetricsSpecProvider } from './redis_metrics';
import { dockerMetricsSpecProvider } from './docker_metrics';
import { kubernetesMetricsSpecProvider } from './kubernetes_metrics';
import { netflowSpecProvider } from './netflow';
import { apmSpecProvider } from './apm';

export function registerTutorials(server) {
  server.registerTutorial(systemLogsSpecProvider);
  server.registerTutorial(systemMetricsSpecProvider);
  server.registerTutorial(apacheLogsSpecProvider);
  server.registerTutorial(apacheMetricsSpecProvider);
  server.registerTutorial(nginxLogsSpecProvider);
  server.registerTutorial(nginxMetricsSpecProvider);
  server.registerTutorial(mysqlLogsSpecProvider);
  server.registerTutorial(mysqlMetricsSpecProvider);
  server.registerTutorial(redisLogsSpecProvider);
  server.registerTutorial(redisMetricsSpecProvider);
  server.registerTutorial(dockerMetricsSpecProvider);
  server.registerTutorial(kubernetesMetricsSpecProvider);
  server.registerTutorial(netflowSpecProvider);
  server.registerTutorial(apmSpecProvider);
}
