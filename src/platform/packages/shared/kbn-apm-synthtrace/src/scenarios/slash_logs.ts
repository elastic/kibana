/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, generateShortId, log } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  getAgentName,
  getCloudProvider,
  getCloudRegion,
  getIpAddress,
  getJavaLogs,
  getServiceName,
  getWebLogs,
  getKubernetesMessages,
  getLinuxMessages,
  KUBERNETES_SERVICES,
  getStableShortId,
  getRandomRange,
} from './helpers/logs_mock_data';
import { getAtIndexOrRandom } from './helpers/get_at_index_or_random';

const LINUX_PROCESSES = ['cron', 'sshd', 'systemd', 'nginx', 'apache2'];

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const constructCommonMetadata = () => ({
    'agent.name': getAgentName(),
    'cloud.provider': getCloudProvider(),
    'cloud.region': getCloudRegion(Math.floor(Math.random() * 3)),
    'cloud.availability_zone': `${getCloudRegion(0)}a`,
    'cloud.instance.id': generateShortId(),
    'cloud.project.id': generateShortId(),
  });

  const generateNginxLogs = (timestamp: number) => {
    return getWebLogs().map((message) => {
      return log
        .createForIndex('logs')
        .setHostIp(getIpAddress())
        .message(message)
        .defaults({
          ...constructCommonMetadata(),
          'log.file.path': `/var/log/nginx/access-${getStableShortId()}.log`,
        })
        .timestamp(timestamp);
    });
  };

  const generateSyslogData = (timestamp: number) => {
    const messages: Record<string, string[]> = getLinuxMessages();

    return getRandomRange().map(() => {
      const processName = getAtIndexOrRandom(LINUX_PROCESSES);
      const message = getAtIndexOrRandom(messages[processName]);
      return log
        .createForIndex('logs')
        .message(message)
        .setHostIp(getIpAddress())
        .defaults({
          ...constructCommonMetadata(),
          'process.name': processName,
          'log.file.path': `/var/log/${processName}.log`,
        })
        .timestamp(timestamp);
    });
  };

  const generateKubernetesLogs = (timestamp: number) => {
    const messages: Record<string, string[]> = getKubernetesMessages();

    return getRandomRange().map(() => {
      const service = getAtIndexOrRandom(KUBERNETES_SERVICES);
      const isStringifiedJSON = Math.random() > 0.5;
      const message = isStringifiedJSON
        ? JSON.stringify({
            serviceName: service,
            message: getAtIndexOrRandom(messages[service]),
          })
        : getAtIndexOrRandom(messages[service]);
      return log
        .createForIndex('logs')
        .message(message)
        .setHostIp(getIpAddress())
        .defaults({
          ...constructCommonMetadata(),
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': `${service}-pod-${getStableShortId()}`,
          'kubernetes.container.name': `${service}-container`,
          'orchestrator.resource.name': service,
        })
        .timestamp(timestamp);
    });
  };

  const generateUnparsedJavaLogs = (timestamp: number) => {
    return getJavaLogs().map((message) => {
      const serviceName = getServiceName(Math.floor(Math.random() * 3));
      return log
        .createForIndex('logs')
        .message(message)
        .defaults({
          ...constructCommonMetadata(),
          'service.name': serviceName,
        })
        .timestamp(timestamp);
    });
  };

  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const nginxLogs = range.interval('1m').generator(generateNginxLogs);
      const syslogData = range.interval('1m').generator(generateSyslogData);
      const kubernetesLogs = range.interval('1m').generator(generateKubernetesLogs);
      const unparsedJavaLogs = range.interval('1m').generator(generateUnparsedJavaLogs);

      return withClient(
        logsEsClient,
        logger.perf('generating_messy_logs', () => [
          nginxLogs,
          syslogData,
          kubernetesLogs,
          unparsedJavaLogs,
        ])
      );
    },
  };
};

export default scenario;
