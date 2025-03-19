/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, type FunctionComponent } from 'react';
import { EuiBadge, EuiPopover, EuiPopoverFooter, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const SolutionsViewBadge: FunctionComponent<{ badgeText: string }> = ({ badgeText }) => {
  const services = useDiscoverServices();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const activeSpace$ = useMemo(
    () => services.spaces?.getActiveSpace$() ?? of(undefined),
    [services.spaces]
  );
  const activeSpace = useObservable(activeSpace$);
  const canManageSpaces = services.capabilities.spaces?.manage === true;

  // Do not render this component if one of the following conditions is met:
  // 1. Solution visibility feature is disabled
  // 2. Spaces is disabled (No active space available)
  // 3. Active space is already configured to use a solution view other than "classic".
  if (
    !services.spaces?.isSolutionViewEnabled ||
    !activeSpace ||
    (activeSpace.solution && activeSpace.solution !== 'classic')
  ) {
    return null;
  }

  const onClickAriaLabel = i18n.translate(
    'discover.topNav.solutionsViewBadge.clickToLearnMoreAriaLabel',
    {
      defaultMessage: 'Click to learn more about the “solution view”',
    }
  );

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="hollow"
          iconType="questionInCircle"
          iconSide="right"
          onClick={() => setIsPopoverOpen((value) => !value)}
          onClickAriaLabel={onClickAriaLabel}
          iconOnClick={() => setIsPopoverOpen((value) => !value)}
          iconOnClickAriaLabel={onClickAriaLabel}
        >
          {badgeText}
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelStyle={{ maxWidth: 300 }}
    >
      {canManageSpaces ? (
        <>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="discover.topNav.solutionsViewBadge.canManageSpacesDescription"
                defaultMessage="We improved Discover so your view adapts to what you're exploring. Choose Observability or Security as your “solution view” in your space settings."
              />
            </p>
          </EuiText>
          <EuiPopoverFooter>
            <EuiLink
              href={services.addBasePath(`/app/management/kibana/spaces/edit/${activeSpace.id}`)}
              target="_blank"
            >
              <FormattedMessage
                id="discover.topNav.solutionsViewBadge.spaceSettingsLink"
                defaultMessage="Space settings"
              />
            </EuiLink>
          </EuiPopoverFooter>
        </>
      ) : (
        <>
          <FormattedMessage
            id="discover.topNav.solutionsViewBadge.cannotManageSpacesDescription"
            defaultMessage="We enhanced Discover to adapt seamlessly to what you're exploring. Select Observability or Security as the “solution view” — ask your admin to set it in the space settings."
          />
          <EuiPopoverFooter>
            <EuiLink
              href={`${services.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/8.16/whats-new.html#_contextual_data_presentation`} // Hardcoded to 8.16 since release notes for other versions will not include the linked feature
              target="_blank"
            >
              <FormattedMessage
                id="discover.topNav.solutionsViewBadge.releaseNotesLink"
                defaultMessage="Check out the release notes"
              />
            </EuiLink>
          </EuiPopoverFooter>
        </>
      )}
    </EuiPopover>
  );
};
