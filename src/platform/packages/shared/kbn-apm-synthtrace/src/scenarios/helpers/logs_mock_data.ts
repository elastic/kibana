/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateShortId } from '@kbn/apm-synthtrace-client';
import { ELASTIC_AGENT_NAMES } from '@kbn/elastic-agent-utils';
import { faker } from '@faker-js/faker';
import { randomInt } from 'crypto';
import moment from 'moment';
import { getAtIndexOrRandom } from './get_at_index_or_random';

const {
  internet: { ipv4, userAgent, httpMethod, httpStatusCode },
  word: { noun, verb },
} = faker;

// Arrays for data
const LOG_LEVELS: string[] = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

export const LINUX_PROCESSES = ['cron', 'sshd', 'systemd', 'nginx', 'apache2'];

// generate 20 short ids to cycle through
const shortIds = Array.from({ length: 20 }, (_, i) => generateShortId());

export function getStableShortId() {
  return shortIds[Math.floor(Math.random() * shortIds.length)];
}

export const getLinuxMessages = () =>
  ({
    cron: [
      `(${moment().toISOString()}) INFO: (CRON) User <userID-${getStableShortId()}> ran command: '/usr/bin/backup.sh'.`,
      `(${moment().toISOString()}) WARN: (CRON) Missing crontab entry for user <userID-${getStableShortId()}>.`,
      `(${moment().toISOString()}) ERROR: (CRON) Failed to execute '/usr/bin/backup.sh'.`,
      `(${moment().toISOString()}) INFO: (CRON) New cron job added for user <userID-${getStableShortId()}>.`,
      `(${moment().toISOString()}) DEBUG: (CRON) Skipping execution of disabled job 'jobID-${getStableShortId()}'.`,
      `(${moment().toISOString()}) INFO: (CRON) Daily backup completed successfully in ${Math.floor(
        Math.random() * 300
      )} seconds.`,
      `(${moment().toISOString()}) ERROR: (CRON) Syntax error in crontab file for user <userID-${getStableShortId()}>.`,
      `(${moment().toISOString()}) INFO: (CRON) Purged old log files during job 'jobID-${getStableShortId()}'.`,
      `(${moment().toISOString()}) WARN: (CRON) Job 'jobID-${getStableShortId()}' exceeded timeout of ${Math.floor(
        Math.random() * 3600
      )} seconds.`,
      `(${moment().toISOString()}) INFO: (CRON) Executing job 'jobID-${getStableShortId()}' as user <userID-${getStableShortId()}>.`,
    ],
    sshd: [
      `${moment().toISOString()} INFO: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Accepted password for user <userID-${getStableShortId()}> from ${getIpAddress()} port ${
        1024 + Math.floor(Math.random() * 50000)
      }.`,
      `${moment().toISOString()} WARN: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Failed password attempt for user <userID-${getStableShortId()}> from ${getIpAddress()} port ${
        1024 + Math.floor(Math.random() * 50000)
      }.`,
      `${moment().toISOString()} INFO: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Connection closed by ${getIpAddress()} port ${
        1024 + Math.floor(Math.random() * 50000)
      }.`,
      `${moment().toISOString()} ERROR: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Invalid public key for user <userID-${getStableShortId()}>.`,
      `${moment().toISOString()} INFO: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Starting session for user <userID-${getStableShortId()}>.`,
      `${moment().toISOString()} WARN: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Too many authentication failures from ${getIpAddress()}.`,
      `${moment().toISOString()} INFO: sshd[${Math.floor(
        Math.random() * 10000
      )}]: User <userID-${getStableShortId()}> disconnected.`,
      `${moment().toISOString()} ERROR: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Attempt to use forbidden user <userID-${getStableShortId()}>.`,
      `${moment().toISOString()} INFO: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Received SIGHUP signal. Reloading configuration.`,
      `${moment().toISOString()} DEBUG: sshd[${Math.floor(
        Math.random() * 10000
      )}]: Monitoring connections on port 22.`,
    ],
    systemd: [
      `${moment().toISOString()} INFO: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Started service <service-${getStableShortId()}>.`,
      `${moment().toISOString()} ERROR: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Failed to start service <service-${getStableShortId()}>.`,
      `${moment().toISOString()} INFO: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Stopped service <service-${getStableShortId()}>.`,
      `${moment().toISOString()} DEBUG: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Reloading daemon configuration.`,
      `${moment().toISOString()} WARN: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Service <service-${getStableShortId()}> restarted too many times.`,
      `${moment().toISOString()} INFO: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Mounted <mount-${getStableShortId()}>.`,
      `${moment().toISOString()} ERROR: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Unit <unit-${getStableShortId()}> entered failed state.`,
      `${moment().toISOString()} INFO: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Timer <timer-${getStableShortId()}> triggered.`,
      `${moment().toISOString()} WARN: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Service <service-${getStableShortId()}> is inactive.`,
      `${moment().toISOString()} DEBUG: systemd[${Math.floor(
        Math.random() * 10000
      )}]: Service <service-${getStableShortId()}> received SIGTERM.`,
    ],
    nginx: [
      `${moment().toISOString()} INFO: nginx[${Math.floor(
        Math.random() * 10000
      )}]: Access log: ${getIpAddress()} - - [${moment().format(
        'DD/MMM/YYYY:HH:mm:ss Z'
      )}] "GET /path-${getStableShortId()} HTTP/1.1" ${
        200 + Math.floor(Math.random() * 100)
      } ${Math.floor(Math.random() * 10000)}.`,
      `${moment().toISOString()} ERROR: nginx[${Math.floor(
        Math.random() * 10000
      )}]: 502 Bad Gateway for request to /path-${getStableShortId()}.`,
      `${moment().toISOString()} WARN: nginx[${Math.floor(
        Math.random() * 10000
      )}]: Upstream server timed out on /path-${getStableShortId()}.`,
      `${moment().toISOString()} INFO: nginx[${Math.floor(
        Math.random() * 10000
      )}]: Server restarted successfully.`,
      `${moment().toISOString()} DEBUG: nginx[${Math.floor(
        Math.random() * 10000
      )}]: Cache hit for /path-${getStableShortId()}.`,
    ],
    apache2: [
      `${moment().toISOString()} INFO: apache2[${Math.floor(
        Math.random() * 10000
      )}]: GET /path-${getStableShortId()} HTTP/1.1" ${
        200 + Math.floor(Math.random() * 100)
      } ${Math.floor(Math.random() * 10000)} bytes.`,
      `${moment().toISOString()} ERROR: apache2[${Math.floor(
        Math.random() * 10000
      )}]: 500 Internal Server Error for request /path-${getStableShortId()}.`,
      `${moment().toISOString()} WARN: apache2[${Math.floor(
        Math.random() * 10000
      )}]: Worker process terminated unexpectedly.`,
      `${moment().toISOString()} INFO: apache2[${Math.floor(
        Math.random() * 10000
      )}]: Server restarted.`,
      `${moment().toISOString()} DEBUG: apache2[${Math.floor(
        Math.random() * 10000
      )}]: Keep-alive timeout on connection ${Math.floor(Math.random() * 10000)}.`,
    ],
  } as Record<string, string[]>);

export const KUBERNETES_SERVICES = [
  'auth-service',
  'payment-service',
  'inventory-service',
  'ui-service',
  'notification-service',
];

export const getKubernetesMessages = () =>
  ({
    'auth-service': [
      `User <userID-${getStableShortId()}> authenticated successfully at ${moment().toISOString()}.`,
      `Failed login attempt for user <userID-${getStableShortId()}> at ${moment().toISOString()}.`,
      `Token expired for user <userID-${getStableShortId()}>.`,
      `Session started for user <userID-${getStableShortId()}>.`,
      `Password reset requested by user <userID-${getStableShortId()}>.`,
      `Invalid JWT token provided for user <userID-${getStableShortId()}>.`,
      `New user <userID-${getStableShortId()}> registered at ${moment().toISOString()}.`,
      `MFA challenge triggered for user <userID-${getStableShortId()}>.`,
      `MFA challenge succeeded for user <userID-${getStableShortId()}>.`,
      `MFA challenge failed for user <userID-${getStableShortId()}>.`,
      `Access revoked for user <userID-${getStableShortId()}>.`,
      `User <userID-${getStableShortId()}> deleted their account.`,
      `Permission granted for resource <resource-${getStableShortId()}>.`,
      `Permission denied for resource <resource-${getStableShortId()}>.`,
      `Role updated for user <userID-${getStableShortId()}>.`,
      `User <userID-${getStableShortId()}> logged out.`,
      `Invalid credentials provided for user <userID-${getStableShortId()}>.`,
      `Security alert triggered at ${moment().toISOString()} for user <userID-${getStableShortId()}>.`,
      `Session expired for user <userID-${getStableShortId()}>.`,
      `Password changed successfully for user <userID-${getStableShortId()}>.`,
    ],
    'payment-service': [
      `Payment of $${(Math.random() * 1000).toFixed(
        2
      )} processed successfully at ${moment().toISOString()}.`,
      `Card declined for transaction <transactionID-${getStableShortId()}>.`,
      `Refund initiated for transaction <transactionID-${getStableShortId()}>.`,
      `Refund of $${(Math.random() * 500).toFixed(2)} processed successfully.`,
      `Payment gateway timeout during transaction <transactionID-${getStableShortId()}>.`,
      `Fraudulent transaction detected at ${moment().toISOString()}.`,
      `Payment pending approval for transaction <transactionID-${getStableShortId()}>.`,
      `Payment gateway configuration error.`,
      `Payment of $${(Math.random() * 200).toFixed(
        2
      )} canceled by user <userID-${getStableShortId()}>.`,
      `Recurring payment of $${(Math.random() * 50).toFixed(2)} initiated.`,
      `Subscription for <userID-${getStableShortId()}> renewed successfully.`,
      `Subscription for <userID-${getStableShortId()}> canceled.`,
      `Invoice <invoiceID-${getStableShortId()}> generated.`,
      `Invoice <invoiceID-${getStableShortId()}> sent to user <userID-${getStableShortId()}>.`,
      `Payment method added for user <userID-${getStableShortId()}>.`,
      `Payment method removed for user <userID-${getStableShortId()}>.`,
      `Credit limit exceeded for user <userID-${getStableShortId()}>.`,
      `Insufficient funds for transaction <transactionID-${getStableShortId()}>.`,
      `Transaction rollback initiated for <transactionID-${getStableShortId()}>.`,
      `Chargeback received for transaction <transactionID-${getStableShortId()}>.`,
    ],
    'inventory-service': [
      `Stock level updated for item <itemID-${getStableShortId()}>: ${Math.floor(
        Math.random() * 500
      )} units remaining.`,
      `Item <itemID-${getStableShortId()}> added to catalog at ${moment().toISOString()}.`,
      `Item <itemID-${getStableShortId()}> removed from catalog.`,
      `Stock alert for item <itemID-${getStableShortId()}>: Low inventory (${Math.floor(
        Math.random() * 20
      )} units left).`,
      `Stock replenished for item <itemID-${getStableShortId()}>.`,
      `Inventory check completed for warehouse <warehouseID-${getStableShortId()}>.`,
      `Item <itemID-${getStableShortId()}> flagged as discontinued.`,
      `Bulk update performed on inventory.`,
      `Price updated for item <itemID-${getStableShortId()}>.`,
      `Warehouse <warehouseID-${getStableShortId()}> status: Operational.`,
      `Warehouse <warehouseID-${getStableShortId()}> reported system failure.`,
      `Item <itemID-${getStableShortId()}> backordered.`,
      `New shipment received for item <itemID-${getStableShortId()}>.`,
      `Item <itemID-${getStableShortId()}> sold out.`,
      `Item <itemID-${getStableShortId()}> marked for promotion.`,
      `Warehouse <warehouseID-${getStableShortId()}> restocked.`,
      `Stock audit started at ${moment().toISOString()}.`,
      `Inventory discrepancy reported for item <itemID-${getStableShortId()}>.`,
      `Restock delayed for item <itemID-${getStableShortId()}>.`,
      `Item <itemID-${getStableShortId()}> reserved for order <orderID-${getStableShortId()}>.`,
    ],
    'ui-service': [
      `Page <path-${getStableShortId()}> rendered successfully at ${moment().toISOString()}.`,
      `User clicked button <button-${getStableShortId()}>.`,
      `API call to <endpoint-${getStableShortId()}> completed in ${Math.floor(
        Math.random() * 300
      )}ms.`,
      `UI component <component-${getStableShortId()}> loaded successfully.`,
      `UI component <component-${getStableShortId()}> failed to load.`,
      `Session timeout for user <userID-${getStableShortId()}>.`,
      `Error rendering component <component-${getStableShortId()}>: Invalid data.`,
      `User navigated to <path-${getStableShortId()}>.`,
      `CSS stylesheet <style-${getStableShortId()}> loaded.`,
      `JavaScript file <script-${getStableShortId()}> executed.`,
      `UI error at ${moment().toISOString()}: Cannot read property 'undefined'.`,
      `Form submitted by user <userID-${getStableShortId()}>.`,
      `Dialog <dialog-${getStableShortId()}> displayed.`,
      `Modal <modal-${getStableShortId()}> closed by user.`,
      `Drag-and-drop interaction started.`,
      `Drag-and-drop interaction completed.`,
      `Keyboard shortcut activated: Ctrl+${String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      )}.`,
      `New notification displayed to user <userID-${getStableShortId()}>.`,
      `UI settings updated by user <userID-${getStableShortId()}>.`,
      `User logged out from UI.`,
    ],
    'notification-service': [
      `Email sent to user <userID-${getStableShortId()}>.`,
      `Push notification delivered to user <userID-${getStableShortId()}>.`,
      `SMS sent to phone number <phone-${getStableShortId()}>.`,
      `Email delivery failed for user <userID-${getStableShortId()}>.`,
      `Push notification failed for user <userID-${getStableShortId()}>.`,
      `SMS delivery failed for phone number <phone-${getStableShortId()}>.`,
      `User <userID-${getStableShortId()}> opted out of notifications.`,
      `New email template <templateID-${getStableShortId()}> created.`,
      `New push notification template <templateID-${getStableShortId()}> created.`,
      `New SMS template <templateID-${getStableShortId()}> created.`,
      `Batch email sent to ${Math.floor(Math.random() * 500)} recipients.`,
      `Batch push notifications sent to ${Math.floor(Math.random() * 500)} recipients.`,
      `Batch SMS sent to ${Math.floor(Math.random() * 500)} recipients.`,
      `Template <templateID-${getStableShortId()}> deleted.`,
      `Notification settings updated for user <userID-${getStableShortId()}>.`,
      `Email verification sent to user <userID-${getStableShortId()}>.`,
      `Password reset notification sent to user <userID-${getStableShortId()}>.`,
      `Marketing email sent to user <userID-${getStableShortId()}>.`,
      `Reminder notification sent to user <userID-${getStableShortId()}>.`,
      `System maintenance notification sent to all users.`,
    ],
  } as Record<string, string[]>);

export const getJavaMessages = () => [
  '[main] com.example1.core.ApplicationCore - Critical failure: NullPointerException encountered during startup',
  '[main] com.example1.core.ApplicationCore - Application started successfully in 3456ms',
  '[main] com.example1.core.ApplicationCore - Configuring bean "dataSource" of type HikariCP',
  '[main] com.example1.core.ApplicationCore - Memory usage threshold exceeded. GC invoked.',
  '[main] com.example1.core.ApplicationCore - Shutting down gracefully on SIGTERM',

  '[main] com.example2.service.PaymentService - Payment processed successfully for orderId: ORD-' +
    generateShortId(),
  '[main] com.example2.service.PaymentService - Failed to process payment for orderId: ORD-' +
    generateShortId() +
    '. Reason: Insufficient funds.',
  '[main] com.example2.service.PaymentService - Payment gateway timeout for orderId: ORD-' +
    generateShortId(),
  '[main] com.example2.service.PaymentService - Initiating refund for transactionId: TXN-' +
    generateShortId(),
  '[main] com.example2.service.PaymentService - Payment retry attempt started for orderId: ORD-' +
    generateShortId(),

  '[main] com.example3.util.JsonParser - Parsing JSON response from external API',
  '[main] com.example3.util.JsonParser - Invalid JSON encountered: {"invalid_key":"missing_value"}',
  '[main] com.example3.util.JsonParser - Successfully parsed JSON for userId: ' +
    Math.floor(Math.random() * 10000),
  '[main] com.example3.util.JsonParser - JSON parsing failed due to org.json.JSONException: Unterminated string',
  '[main] com.example3.util.JsonParser - Fallback to default configuration triggered due to parsing error',

  '[main] com.example4.security.AuthManager - Unauthorized access attempt detected for userId: ' +
    Math.floor(Math.random() * 100000),
  '[main] com.example4.security.AuthManager - Password updated for userId: ' +
    Math.floor(Math.random() * 100000),
  '[main] com.example4.security.AuthManager - User account locked after 3 failed login attempts for userId: ' +
    Math.floor(Math.random() * 100000),
  '[main] com.example4.security.AuthManager - Token validation failed for token: TOKEN-' +
    generateShortId(),
  '[main] com.example4.security.AuthManager - User session terminated for userId: ' +
    Math.floor(Math.random() * 100000),

  '[main] com.example5.dao.UserDao - Database query failed: java.sql.SQLException: Timeout expired',
  '[main] com.example5.dao.UserDao - Retrieved 10 results for query: SELECT * FROM users WHERE status = "active"',
  '[main] com.example5.dao.UserDao - Connection pool exhausted. Waiting for available connection.',
  '[main] com.example5.dao.UserDao - Insert operation succeeded for userId: ' +
    Math.floor(Math.random() * 100000),
  '[main] com.example5.dao.UserDao - Detected stale connection. Retrying operation.',

  '[main] com.example6.metrics.MetricsCollector - Reporting CPU usage: ' +
    (Math.random() * 100).toFixed(2) +
    '%',
  '[main] com.example6.metrics.MetricsCollector - Application uptime: ' +
    Math.floor(Math.random() * 86400) +
    ' seconds',
  '[main] com.example6.metrics.MetricsCollector - Memory usage: Heap=128MB Non-Heap=64MB',
  '[main] com.example6.metrics.MetricsCollector - GC activity detected. Time taken: ' +
    Math.floor(Math.random() * 100) +
    'ms',
  '[main] com.example6.metrics.MetricsCollector - Collected metrics for 15 services',

  '[main] com.example7.messaging.MessageQueue - Message published to queue "orders" with messageId: MSG-' +
    generateShortId(),
  '[main] com.example7.messaging.MessageQueue - Consumer failed to process messageId: MSG-' +
    generateShortId() +
    '. Error: NullPointerException',
  '[main] com.example7.messaging.MessageQueue - Queue "notifications" has 50 pending messages',
  '[main] com.example7.messaging.MessageQueue - Retrying message delivery for messageId: MSG-' +
    generateShortId(),
  '[main] com.example7.messaging.MessageQueue - Dead-letter queue reached maximum size. Oldest messages purged.',

  '[main] com.example8.integration.ExternalServiceClient - HTTP 200: Successfully received response from "https://api.example.com/v1/resource"',
  '[main] com.example8.integration.ExternalServiceClient - HTTP 500: Internal Server Error while accessing "https://api.example.com/v1/resource"',
  '[main] com.example8.integration.ExternalServiceClient - Connection timeout occurred after 30 seconds',
  '[main] com.example8.integration.ExternalServiceClient - Retrying request to endpoint "https://api.example.com/v1/resource"',
  '[main] com.example8.integration.ExternalServiceClient - API key validation failed for key: APIKEY-' +
    generateShortId(),
];

const IP_ADDRESSES = [
  '223.72.43.22',
  '20.24.184.101',
  '178.173.228.103',
  '147.161.184.179',
  '34.136.92.88',
];

const GEO_COORDINATES = [
  [116.3861, 39.9143],
  [103.8554, 1.3036],
  [139.7425, 35.6164],
  [2.4075, 48.8323],
  [-95.8517, 41.2591],
];

const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

const CLUSTER = [
  { clusterId: generateShortId(), clusterName: 'synth-cluster-1', namespace: 'default' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-2', namespace: 'production' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-3', namespace: 'kube' },
];

const SERVICE_NAMES = Array(3)
  .fill(null)
  .map((_, idx) => `synth-service-${idx}`);

export const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

// Functions to get random elements
export const getCluster = (index?: number) => getAtIndexOrRandom(CLUSTER, index);
export const getIpAddress = (index?: number) => getAtIndexOrRandom(IP_ADDRESSES, index);
export const getGeoCoordinate = (index?: number) => getAtIndexOrRandom(GEO_COORDINATES, index);
export const getCloudProvider = (index?: number) => getAtIndexOrRandom(CLOUD_PROVIDERS, index);
export const getCloudRegion = (index?: number) => getAtIndexOrRandom(CLOUD_REGION, index);
export const getServiceName = (index?: number) => getAtIndexOrRandom(SERVICE_NAMES, index);
export const getAgentName = (index?: number) => getAtIndexOrRandom(ELASTIC_AGENT_NAMES, index);

export const getJavaLogs = () => {
  const javaLogMessages = getJavaMessages();
  return getRandomRange().map(
    () =>
      `${moment().format('YYYY-MM-DD HH:mm:ss,SSS')} ${getAtIndexOrRandom(
        LOG_LEVELS
      )} ${getAtIndexOrRandom(javaLogMessages)}`
  );
};

export function getRandomRange() {
  return Array.from({ length: Math.floor(Math.random() * 1000) + 1 }).fill(null);
}

export const getWebLogs = () => {
  return getRandomRange().map(() => {
    const path = `/api/${noun()}/${verb()}`;
    const bytes = randomInt(100, 4000);

    return `${ipv4()} - - [${moment().toISOString()}] "${httpMethod()} ${path} HTTP/1.1" ${httpStatusCode()} ${bytes} "-" "${userAgent()}"`;
  });
};
