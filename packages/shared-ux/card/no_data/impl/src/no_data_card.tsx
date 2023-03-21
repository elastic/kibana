/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { RedirectAppLinksContainer } from '@kbn/shared-ux-link-redirect-app';
import type { NoDataCardProps as Props } from '@kbn/shared-ux-card-no-data-types';

import { NoDataCard as Component } from './no_data_card.component';

import { useServices } from './services';

export const NoDataCard = ({ href: srcHref, category, description, ...props }: Props) => {
  const { canAccessFleet, addBasePath } = useServices();

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
    <RedirectAppLinksContainer>
      <Component {...{ ...props, href, canAccessFleet, description }} />
    </RedirectAppLinksContainer>
  );
};
