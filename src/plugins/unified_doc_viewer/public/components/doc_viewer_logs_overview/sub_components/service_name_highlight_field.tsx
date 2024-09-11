/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import { OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE } from '@kbn/management-settings-ids';
import { HighlightField, HighlightFieldProps } from './highlight_field';
import { getUnifiedDocViewerServices } from '../../../plugin';

const SERVICE_ENTITY_LOCATOR = 'SERVICE_ENTITY_LOCATOR';

export function ServiceNameHighlightField(props: HighlightFieldProps) {
  const {
    share: { url: urlService },
    core,
  } = getUnifiedDocViewerServices();
  const canViewApm = core.application.capabilities.apm.show;

  const isEntityCentricExperienceSettingEnabled = core.uiSettings.get(
    OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE
  );

  const apmLinkToServiceEntityLocator = urlService.locators.get<{ serviceName: string }>(
    SERVICE_ENTITY_LOCATOR
  );
  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    serviceName: props.value as string,
  });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () =>
          apmLinkToServiceEntityLocator?.navigate({ serviceName: props.value as string }),
      })
    : undefined;

  return (
    <HighlightField {...props}>
      {canViewApm && isEntityCentricExperienceSettingEnabled && routeLinkProps
        ? ({ content }) => (
            <EuiLink
              {...routeLinkProps}
              data-test-subj="unifiedDocViewLogsOverviewServiceNameHighlightLink"
            >
              {content}
            </EuiLink>
          )
        : undefined}
    </HighlightField>
  );
}
