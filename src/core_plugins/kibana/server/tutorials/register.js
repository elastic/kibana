/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { systemLogsSpecProvider } from './system_logs';
import { systemMetricsSpecProvider } from './system_metrics';
import { apacheLogsSpecProvider } from './apache_logs';
import { apacheMetricsSpecProvider } from './apache_metrics';
import { kafkaLogsSpecProvider } from './kafka_logs';
import { nginxLogsSpecProvider } from './nginx_logs';
import { nginxMetricsSpecProvider } from './nginx_metrics';
import { mysqlLogsSpecProvider } from './mysql_logs';
import { mysqlMetricsSpecProvider } from './mysql_metrics';
import { mongodbMetricsSpecProvider } from './mongodb_metrics';
import { phpfpmMetricsSpecProvider } from './php_fpm_metrics';
import { postgresqlMetricsSpecProvider } from './postgresql_metrics';
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
  server.registerTutorial(kafkaLogsSpecProvider);
  server.registerTutorial(nginxLogsSpecProvider);
  server.registerTutorial(nginxMetricsSpecProvider);
  server.registerTutorial(mysqlLogsSpecProvider);
  server.registerTutorial(mysqlMetricsSpecProvider);
  server.registerTutorial(mongodbMetricsSpecProvider);
  server.registerTutorial(phpfpmMetricsSpecProvider);
  server.registerTutorial(postgresqlMetricsSpecProvider);
  server.registerTutorial(redisLogsSpecProvider);
  server.registerTutorial(redisMetricsSpecProvider);
  server.registerTutorial(dockerMetricsSpecProvider);
  server.registerTutorial(kubernetesMetricsSpecProvider);
  server.registerTutorial(netflowSpecProvider);
  server.registerTutorial(apmSpecProvider);
}
