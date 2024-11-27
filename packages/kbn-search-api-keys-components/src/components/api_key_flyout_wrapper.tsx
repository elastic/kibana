/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ApiKeyFlyout, ApiKeyFlyoutProps } from '@kbn/security-api-key-management';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const API_KEY_NAME = 'Unrestricted API Key';

type ApiKeyFlyoutWrapperProps = Pick<ApiKeyFlyoutProps, 'onCancel'> & {
  onSuccess?: (createApiKeyResponse: SecurityCreateApiKeyResponse) => void;
};

export const ApiKeyFlyoutWrapper: React.FC<ApiKeyFlyoutWrapperProps> = ({
  onCancel,
  onSuccess,
}) => {
  return <ApiKeyFlyout onCancel={onCancel} onSuccess={onSuccess} defaultName={API_KEY_NAME} />;
};
