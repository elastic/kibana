/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlyout } from '@elastic/eui';
import { AppMenuActionType, getFieldValue } from '@kbn/discover-utils';
import React from 'react';
import { RootProfileProvider, SolutionType } from '../../../profiles';

export const createExampleRootProfileProvider = (): RootProfileProvider => ({
  profileId: 'example-root-profile',
  isExperimental: true,
  profile: {
    getCellRenderers: (prev) => (params) => ({
      ...prev(params),
      '@timestamp': (props) => {
        const timestamp = getFieldValue(props.row, '@timestamp') as string;

        return (
          <EuiBadge color="hollow" title={timestamp} data-test-subj="exampleRootProfileTimestamp">
            {timestamp}
          </EuiBadge>
        );
      },
    }),
    /**
     * The `getAppMenu` extension point gives access to AppMenuRegistry with methods registerCustomAction and registerCustomActionUnderSubmenu.
     * The extension also provides the essential params like current dataView, adHocDataViews etc when defining a custom action implementation.
     * And it supports opening custom flyouts and any other modals on the click.
     * `getAppMenu` can be configured in both root and data source profiles.
     * @param prev
     */
    getAppMenu: (prev) => (params) => {
      const prevValue = prev(params);

      // Check `params` for the available deps

      return {
        appMenuRegistry: (registry) => {
          // Note: Only 2 custom actions are allowed to be rendered in the app menu. The rest will be ignored.

          // Register a custom submenu action
          registry.registerCustomAction({
            id: 'example-custom-root-submenu',
            type: AppMenuActionType.custom,
            label: 'Custom Submenu',
            testId: 'example-custom-root-submenu',
            actions: [
              {
                id: 'example-custom-root-action11',
                type: AppMenuActionType.custom,
                controlProps: {
                  label: 'Custom action 11 (from Root profile)',
                  testId: 'example-custom-root-action11',
                  onClick: ({ onFinishAction }) => {
                    alert('Example Root Custom action 11 clicked');
                    onFinishAction(); // This allows to close the popover and return focus back to the app menu DOM node
                  },
                },
              },
              {
                id: 'example-custom-root-action12',
                type: AppMenuActionType.custom,
                controlProps: {
                  label: 'Custom action 12 (from Root profile)',
                  testId: 'example-custom-root-action12',
                  onClick: ({ onFinishAction }) => {
                    // This is an example of a custom action that opens a flyout or any other custom modal.
                    // To do so, simply return a React element and call onFinishAction when you're done.
                    return (
                      <EuiFlyout
                        onClose={onFinishAction}
                        data-test-subj="example-custom-root-action12-flyout"
                      >
                        <div>Example custom action clicked</div>
                      </EuiFlyout>
                    );
                  },
                },
              },
            ],
          });

          return prevValue.appMenuRegistry(registry);
        },
      };
    },
  },
  resolve: (params) => {
    if (params.solutionNavId != null) {
      return { isMatch: false };
    }

    return { isMatch: true, context: { solutionType: SolutionType.Default } };
  },
});
