/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { UserProfilesKibanaProvider } from '@kbn/user-profile-components';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { useSolutionNavUserProfileToggle } from './use_solution_nav_userprofile_toggle';

interface Props {
  security: SecurityPluginStart;
  core: CoreStart;
  defaultOptOutValue: boolean;
}

export const SolutionNavUserProfileToggle = ({ security, core, defaultOptOutValue }: Props) => {
  return (
    <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
      <SolutionNavUserProfileToggleUi defaultOptOutValue={defaultOptOutValue} />
    </UserProfilesKibanaProvider>
  );
};

function SolutionNavUserProfileToggleUi({ defaultOptOutValue }: { defaultOptOutValue: boolean }) {
  const toggleTextSwitchId = useGeneratedHtmlId({ prefix: 'toggleSolutionNavSwitch' });
  const { euiTheme } = useEuiTheme();

  const { userProfileEnabled, toggle, hasOptOut } = useSolutionNavUserProfileToggle({
    defaultOptOutValue,
  });

  if (!userProfileEnabled) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xs">
      <EuiFlexItem>
        <EuiContextMenuItem
          icon="tableOfContents"
          size="s"
          onClick={() => {
            toggle(!hasOptOut);
          }}
          data-test-subj="solutionNavToggle"
        >
          {i18n.translate('navigation.userMenuLinks.useClassicNavigation', {
            defaultMessage: 'Use classic navigation',
          })}
        </EuiContextMenuItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingRight: euiTheme.size.m }}>
        <EuiSwitch
          label={
            hasOptOut
              ? i18n.translate('navigation.userMenuLinks.classicNavigationOnLabel', {
                  defaultMessage: 'on',
                })
              : i18n.translate('navigation.userMenuLinks.classicNavigationOffLabel', {
                  defaultMessage: 'off',
                })
          }
          showLabel={false}
          checked={hasOptOut}
          onChange={(e) => {
            toggle(e.target.checked);
          }}
          aria-describedby={toggleTextSwitchId}
          data-test-subj="solutionNavToggleSwitch"
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
