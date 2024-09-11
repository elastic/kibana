/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getRouterLinkProps } from '@kbn/router-utils';
import { EuiLink } from '@elastic/eui';
import { OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE } from '@kbn/management-settings-ids';
import { type ChipWithPopoverProps, ChipWithPopover } from './popover_chip';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

const SERVICE_ENTITY_LOCATOR = 'SERVICE_ENTITY_LOCATOR';

export function ServiceNameChipWithPopover(props: ChipWithPopoverProps) {
  const { share, core } = useDiscoverServices();
  const canViewApm = core.application.capabilities.apm.show;
  const isEntityCentricExperienceSettingEnabled = core.uiSettings.get(
    OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE
  );
  const urlService = share?.url;

  const apmLinkToServiceEntityLocator = urlService?.locators.get<{ serviceName: string }>(
    SERVICE_ENTITY_LOCATOR
  );
  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    serviceName: props.text,
  });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => apmLinkToServiceEntityLocator?.navigate({ serviceName: props.text }),
      })
    : undefined;

  return (
    <ChipWithPopover {...props}>
      {canViewApm && isEntityCentricExperienceSettingEnabled && routeLinkProps
        ? ({ content }) => <EuiLink {...routeLinkProps}>{content}</EuiLink>
        : undefined}
    </ChipWithPopover>
  );
}
