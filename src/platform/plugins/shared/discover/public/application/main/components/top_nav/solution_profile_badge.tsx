/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, type FunctionComponent } from 'react';
import {
  EuiBadge,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiLink,
  EuiThemeProvider,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { ENABLE_SOLUTION_PROFILES_IN_CLASSIC_SETTING } from '@kbn/discover-utils';
import type { DiscoverServices } from '../../../../build_services';
import type { ActiveSolution } from './get_active_solution_profile';

const SETTINGS_DEEP_LINK_PATH = `/app/management/kibana/settings?query=${ENABLE_SOLUTION_PROFILES_IN_CLASSIC_SETTING}`;

export const getSolutionProfileBadgeText = (activeSolution: ActiveSolution): string =>
  activeSolution === 'security'
    ? i18n.translate('discover.topNav.solutionProfileBadge.securityLabel', {
        defaultMessage: 'Security view',
      })
    : i18n.translate('discover.topNav.solutionProfileBadge.observabilityLabel', {
        defaultMessage: 'Observability view',
      });

export const SolutionProfileBadge: FunctionComponent<{
  services: DiscoverServices;
  activeSolution: ActiveSolution;
}> = ({ services, activeSolution }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const theme = useObservable(services.theme.theme$, services.theme.getTheme());
  const activeSpace$ = useMemo(
    () => services.spaces?.getActiveSpace$() ?? of(undefined),
    [services.spaces]
  );
  const activeSpace = useObservable(activeSpace$);

  const canManageSpaces = services.capabilities.spaces?.manage === true;
  const canEditAdvancedSettings = services.capabilities.advancedSettings?.save === true;
  const badgeText = getSolutionProfileBadgeText(activeSolution);

  // The space can still adopt a solution view when Spaces is available and the space is classic.
  const canPromoteSolutionView =
    Boolean(services.spaces?.isSolutionViewEnabled) &&
    Boolean(activeSpace) &&
    (!activeSpace?.solution || activeSpace.solution === 'classic');
  const spaceSettingsHref = activeSpace
    ? services.addBasePath(`/app/management/kibana/spaces/edit/${activeSpace.id}`)
    : undefined;

  const onClickAriaLabel = i18n.translate(
    'discover.topNav.solutionProfileBadge.clickToLearnMoreAriaLabel',
    {
      defaultMessage: 'Click to learn more about the active contextual profile',
    }
  );

  return (
    <EuiThemeProvider colorMode={theme.darkMode ? 'dark' : 'light'}>
      <EuiPopover
        aria-label={badgeText}
        button={
          <EuiBadge
            color="hollow"
            iconType="sparkles"
            iconSide="left"
            onClick={() => setIsPopoverOpen((value) => !value)}
            onClickAriaLabel={onClickAriaLabel}
          >
            {badgeText}
          </EuiBadge>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelStyle={{ maxWidth: 320 }}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="discover.topNav.solutionProfileBadge.description"
              defaultMessage="Discover adapted this view to your data."
            />
          </p>
          {canPromoteSolutionView && (
            <p>
              {canManageSpaces && spaceSettingsHref ? (
                <FormattedMessage
                  id="discover.topNav.solutionProfileBadge.switchPrompt"
                  defaultMessage="For a more complete experience, switch your space to the {solutionViewLink}."
                  values={{
                    solutionViewLink: (
                      <EuiLink href={spaceSettingsHref} target="_blank">
                        {badgeText}
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="discover.topNav.solutionProfileBadge.switchPromptNoPermission"
                  defaultMessage="For a more complete experience, ask your administrator to switch your space to the {solutionView}."
                  values={{ solutionView: badgeText }}
                />
              )}
            </p>
          )}
        </EuiText>
        <EuiPopoverFooter>
          {canEditAdvancedSettings ? (
            <EuiLink href={services.addBasePath(SETTINGS_DEEP_LINK_PATH)} target="_blank">
              <FormattedMessage
                id="discover.topNav.solutionProfileBadge.turnOffLink"
                defaultMessage="Turn off in Advanced Settings"
              />
            </EuiLink>
          ) : (
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="discover.topNav.solutionProfileBadge.contactAdmin"
                  defaultMessage="Contact your administrator to turn off contextual profiles."
                />
              </p>
            </EuiText>
          )}
        </EuiPopoverFooter>
      </EuiPopover>
    </EuiThemeProvider>
  );
};
