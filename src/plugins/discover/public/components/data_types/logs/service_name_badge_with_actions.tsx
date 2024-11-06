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
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { FieldBadgeWithActions, FieldBadgeWithActionsProps } from './cell_actions_popover';

const SERVICE_ENTITY_LOCATOR = 'SERVICE_ENTITY_LOCATOR';

export function ServiceNameBadgeWithActions(props: FieldBadgeWithActionsProps) {
  const { share, core } = useDiscoverServices();
  const canViewApm = core.application.capabilities.apm?.show || false;
  const isEntityCentricExperienceSettingEnabled = canViewApm
    ? core.uiSettings.get(OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE)
    : false;

  const derivedPropsForEntityExperience = isEntityCentricExperienceSettingEnabled
    ? getDerivedPropsForEntityExperience({ serviceName: props.value, share })
    : {};

  return <FieldBadgeWithActions {...props} {...derivedPropsForEntityExperience} />;
}

const getDerivedPropsForEntityExperience = ({
  serviceName,
  share,
}: {
  serviceName: string;
  share?: SharePublicStart;
}): Pick<FieldBadgeWithActionsProps, 'renderValue'> => {
  const apmLinkToServiceEntityLocator = share?.url?.locators.get<{ serviceName: string }>(
    SERVICE_ENTITY_LOCATOR
  );
  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({ serviceName });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => apmLinkToServiceEntityLocator?.navigate({ serviceName }),
      })
    : undefined;

  if (routeLinkProps) {
    return {
      renderValue: (value) => <EuiLink {...routeLinkProps}>{value}</EuiLink>,
    };
  }

  return {};
};
