/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { useApplication, useHttp, usePermissions } from '@kbn/shared-ux-services';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import useObservable from 'react-use/lib/useObservable';

import { ElasticAgentCardProps } from './types';
import { ElasticAgentCardComponent } from './elastic_agent_card.component';

export const ElasticAgentCard = (props: ElasticAgentCardProps) => {
  const { canAccessFleet } = usePermissions();
  const { addBasePath } = useHttp();
  const { navigateToUrl, currentAppId$ } = useApplication();
  const currentAppId = useObservable(currentAppId$);

  const { href: srcHref, category } = props;

  const href = useMemo(() => {
    if (srcHref) {
      return srcHref;
    }

    // TODO: get this URL from a locator
    const prefix = '/app/integrations/browse';

    if (category) {
      return addBasePath(`${prefix}/${category}`);
    }

    return addBasePath(prefix);
  }, [addBasePath, srcHref, category]);

  return (
    <RedirectAppLinks {...{ currentAppId, navigateToUrl }}>
      <ElasticAgentCardComponent {...{ ...props, href, canAccessFleet }} />
    </RedirectAppLinks>
  );
};
