/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useApplication, useHttp, usePermissions } from '@kbn/shared-ux-services';

import { ElasticAgentCardProps } from './types';
import { ElasticAgentCardComponent } from './elastic_agent_card.component';

export const ElasticAgentCard = (props: ElasticAgentCardProps) => {
  const { canAccessFleet } = usePermissions();
  const { addBasePath } = useHttp();
  const { navigateToUrl, currentAppId$ } = useApplication();

  const createHref = () => {
    const { href, category } = props;
    if (href) {
      return href;
    }
    // TODO: get this URL from a locator
    const prefix = '/app/integrations/browse';
    if (category) {
      return addBasePath(`${prefix}/${category}`);
    }
    return prefix;
  };

  return (
    <ElasticAgentCardComponent
      {...props}
      href={createHref()}
      canAccessFleet={canAccessFleet}
      navigateToUrl={navigateToUrl}
      currentAppId$={currentAppId$}
    />
  );
};
