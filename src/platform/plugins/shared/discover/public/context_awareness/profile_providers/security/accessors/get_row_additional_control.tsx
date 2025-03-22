/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { RowControlColumn } from '@kbn/discover-utils';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { ExploreInSecurity } from '../components/row_leading_controls/explore_in_security';

export function getRowAdditionalLeadingControls({
  services,
  additionalControls,
}: {
  services: ProfileProviderServices;
  additionalControls: RowControlColumn[];
}) {
  const createExploreInSecurityControl = (): RowControlColumn => {
    return {
      id: 'exploreInSecurity',
      headerAriaLabel: 'Explore in Security',
      renderControl: (Control, props) => (
        <ExploreInSecurity Control={Control} rowProps={props} services={services} />
      ),
    };
  };

  return [...additionalControls, createExploreInSecurityControl()];
}
