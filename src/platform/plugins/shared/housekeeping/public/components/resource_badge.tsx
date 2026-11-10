/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { EuiBadge, EuiLink } from '@elastic/eui';
import type { HousekeepingResource } from '../../common';
import { ResourceLinksContext, useResourceTypeInfo } from '../metadata';

export const ResourceTypeBadge = ({ type }: { type: string }) => {
  const { label } = useResourceTypeInfo(type);
  return <EuiBadge color="hollow">{label}</EuiBadge>;
};

export const ResourceName = ({ resource }: { resource: HousekeepingResource }) => {
  const link = useContext(ResourceLinksContext)(resource);
  return link ? (
    <EuiLink href={link.href} onClick={link.onClick} data-test-subj="housekeepingResourceLink">
      <strong>{resource.id}</strong>
    </EuiLink>
  ) : (
    <strong>{resource.id}</strong>
  );
};
