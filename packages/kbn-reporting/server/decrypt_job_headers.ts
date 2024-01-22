/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';
import { cryptoFactory } from './crypto';

export const decryptJobHeaders = async (
  encryptionKey: string | undefined,
  headers: string,
  logger: Logger
): Promise<Record<string, string>> => {
  try {
    if (typeof headers !== 'string') {
      throw new Error(
        i18n.translate('reporting.commonExportTypesHelpers.missingJobHeadersErrorMessage', {
          defaultMessage: 'Job headers are missing',
        })
      );
    }
    const crypto = cryptoFactory(encryptionKey);
    const decryptedHeaders = (await crypto.decrypt(headers)) as Record<string, string>;
    return decryptedHeaders;
  } catch (err) {
    logger.error(err);

    throw new Error(
      i18n.translate(
        'reporting.commonExportTypesHelpers.failedToDecryptReportJobDataErrorMessage',
        {
          defaultMessage:
            'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
          values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
        }
      )
    );
  }
};
