/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-types';
import { AlertingFrameworkHealth, AlertsHealth } from '@kbn/alerting-types';
import { BASE_ALERTING_API_PATH } from '../constants';

const rewriteAlertingFrameworkHealth: RewriteRequestCase<AlertsHealth> = ({
  decryption_health: decryptionHealth,
  execution_health: executionHealth,
  read_health: readHealth,
  ...res
}: AsApiContract<AlertsHealth>) => ({
  decryptionHealth,
  executionHealth,
  readHealth,
  ...res,
});

const rewriteBodyRes: RewriteRequestCase<AlertingFrameworkHealth> = ({
  is_sufficiently_secure: isSufficientlySecure,
  has_permanent_encryption_key: hasPermanentEncryptionKey,

  alerting_framework_health: alertingFrameworkHealth,
  ...res
}: AsApiContract<AlertingFrameworkHealth>) => ({
  isSufficientlySecure,
  hasPermanentEncryptionKey,
  alertingFrameworkHealth,
  ...res,
});

export async function fetchAlertingFrameworkHealth({
  http,
}: {
  http: HttpSetup;
}): Promise<AlertingFrameworkHealth> {
  const res = await http.get<AsApiContract<AlertingFrameworkHealth>>(
    `${BASE_ALERTING_API_PATH}/_health`
  );
  const alertingFrameworkHealthRewrited = rewriteAlertingFrameworkHealth(
    res.alerting_framework_health as unknown as AsApiContract<AlertsHealth>
  );
  return {
    ...rewriteBodyRes(res),
    alertingFrameworkHealth: alertingFrameworkHealthRewrited,
  };
}
