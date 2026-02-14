/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

const ELASTICSEARCH_URL_PLACEHOLDER = 'https://your_deployment_url';

/**
 * Retrieves the public Elasticsearch URL when running on Elastic Cloud.
 * Falls back to a placeholder if Cloud is not available or returns no URL.
 */
export const useElasticsearchUrl = (): string => {
  const {
    services: { cloud },
  } = useKibana();
  const [elasticsearchUrl, setElasticsearchUrl] = useState(ELASTICSEARCH_URL_PLACEHOLDER);

  useEffect(() => {
    cloud
      ?.fetchElasticsearchConfig()
      .then((config) => {
        setElasticsearchUrl(config?.elasticsearchUrl || ELASTICSEARCH_URL_PLACEHOLDER);
      })
      .catch(() => {
        // Keep placeholder if Cloud isn't available
      });
  }, [cloud]);

  return elasticsearchUrl;
};
