/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiLink, EuiFlyout, EuiPanel } from '@elastic/eui';
import {
  AppMenuActionId,
  AppMenuActionType,
  getFieldValue,
  RowControlColumn,
} from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { capitalize } from 'lodash';
import React from 'react';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { useExampleContext } from '../example_context';

export const createExampleDataSourceProfileProvider = (): DataSourceProfileProvider<{
  formatRecord: (flattenedRecord: Record<string, unknown>) => string;
}> => ({
  profileId: 'example-data-source-profile',
  isExperimental: true,
  profile: {
    getCellRenderers: (prev) => (params) => ({
      ...prev(params),
      'log.level': (props) => {
        const level = getFieldValue(props.row, 'log.level') as string;

        if (!level) {
          return (
            <span
              css={{ color: euiThemeVars.euiTextSubduedColor }}
              data-test-subj="exampleDataSourceProfileLogLevelEmpty"
            >
              (None)
            </span>
          );
        }

        const levelMap: Record<string, string> = {
          info: 'primary',
          debug: 'default',
          error: 'danger',
        };

        return (
          <EuiBadge
            color={levelMap[level]}
            title={level}
            data-test-subj="exampleDataSourceProfileLogLevel"
          >
            {capitalize(level)}
          </EuiBadge>
        );
      },
      message: function Message(props) {
        const { currentMessage, setCurrentMessage } = useExampleContext();
        const message = getFieldValue(props.row, 'message') as string;

        return (
          <EuiLink
            onClick={() => setCurrentMessage(message)}
            css={{ fontWeight: currentMessage === message ? 'bold' : undefined }}
            data-test-subj="exampleDataSourceProfileMessage"
          >
            {message}
          </EuiLink>
        );
      },
    }),
    getDocViewer:
      (prev, { context }) =>
      (params) => {
        const recordId = params.record.id;
        const prevValue = prev(params);
        return {
          title: `Record #${recordId}`,
          docViewsRegistry: (registry) => {
            registry.add({
              id: 'doc_view_example',
              title: 'Example',
              order: 0,
              component: () => (
                <EuiPanel color="transparent" hasShadow={false}>
                  <div data-test-subj="exampleDataSourceProfileDocView">Example Doc View</div>
                  <pre data-test-subj="exampleDataSourceProfileDocViewRecord">
                    {context.formatRecord(params.record.flattened)}
                  </pre>
                </EuiPanel>
              ),
            });

            return prevValue.docViewsRegistry(registry);
          },
        };
      },
    /**
     * The `getAppMenu` extension point gives access to AppMenuRegistry with methods registerCustomAction and registerCustomActionUnderSubmenu.
     * The extension also provides the essential params like current dataView, adHocDataViews etc when defining a custom action implementation.
     * And it supports opening custom flyouts and any other modals on the click.
     * `getAppMenu` can be configured in both root and data source profiles.
     * @param prev
     */
    getAppMenu: (prev) => (params) => {
      const prevValue = prev(params);

      // This is what is available via params:
      // const { dataView, services, isEsqlMode, adHocDataViews, onUpdateAdHocDataViews } = params;

      return {
        appMenuRegistry: (registry) => {
          // Note: Only 2 custom actions are allowed to be rendered in the app menu. The rest will be ignored.

          // Can be a on-click action, link or a submenu with an array of actions and horizontal rules
          registry.registerCustomAction({
            id: 'example-custom-action',
            type: AppMenuActionType.custom,
            controlProps: {
              label: 'Custom action',
              testId: 'example-custom-action',
              onClick: ({ onFinishAction }) => {
                alert('Example Custom action clicked');
                onFinishAction(); // This allows to return focus back to the app menu DOM node
              },
            },
            // In case of a submenu, you can add actions to it under `actions`
            // actions: [
            //   {
            //     id: 'example-custom-action-1-1',
            //     type: AppMenuActionType.custom,
            //     controlProps: {
            //       label: 'Custom action',
            //       onClick: ({ onFinishAction }) => {
            //         alert('Example Custom action clicked');
            //         onFinishAction();
            //       },
            //     },
            //   },
            //   {
            //     id: 'example-custom-action-1-2',
            //     type: AppMenuActionType.submenuHorizontalRule
            //   },
            //   ...
            // ],
          });

          // This example shows how to add a custom action under the Alerts submenu
          registry.registerCustomActionUnderSubmenu(AppMenuActionId.alerts, {
            // It's also possible to override the submenu actions by using the same id
            // as `AppMenuActionId.createRule` or `AppMenuActionId.manageRulesAndConnectors`
            id: 'example-custom-action4',
            type: AppMenuActionType.custom,
            order: 101,
            controlProps: {
              label: 'Create SLO (Custom action)',
              iconType: 'visGauge',
              testId: 'example-custom-action-under-alerts',
              onClick: ({ onFinishAction }) => {
                // This is an example of a custom action that opens a flyout or any other custom modal.
                // To do so, simply return a React element and call onFinishAction when you're done.
                return (
                  <EuiFlyout onClose={onFinishAction}>
                    <div>Example custom action clicked</div>
                  </EuiFlyout>
                );
              },
            },
          });

          // This submenu was defined in the root profile example_root_pofile/profile.tsx
          // And we can still add actions to it from the data source profile here.
          registry.registerCustomActionUnderSubmenu('example-custom-root-submenu', {
            id: 'example-custom-action5',
            type: AppMenuActionType.custom,
            controlProps: {
              label: 'Custom action (from Data Source profile)',
              onClick: ({ onFinishAction }) => {
                alert('Example Data source action under root submenu clicked');
                onFinishAction();
              },
            },
          });

          return prevValue.appMenuRegistry(registry);
        },
      };
    },
    getRowAdditionalLeadingControls: (prev) => (params) => {
      const additionalControls = prev(params) || [];

      return [
        ...additionalControls,
        ...['visBarVerticalStacked', 'heart', 'inspect'].map(
          (iconType, index): RowControlColumn => ({
            id: `exampleControl_${iconType}`,
            headerAriaLabel: `Example Row Control ${iconType}`,
            renderControl: (Control, rowProps) => {
              return (
                <Control
                  data-test-subj={`exampleLogsControl_${iconType}`}
                  label={`Example ${iconType}`}
                  tooltipContent={`Example ${iconType}`}
                  iconType={iconType}
                  onClick={() => {
                    alert(`Example "${iconType}" control clicked. Row index: ${rowProps.rowIndex}`);
                  }}
                />
              );
            },
          })
        ),
      ];
    },
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: '@timestamp',
          width: 212,
        },
        {
          name: 'log.level',
          width: 150,
        },
        {
          name: 'message',
        },
      ],
      rowHeight: 5,
    }),
    getAdditionalCellActions: (prev) => () =>
      [
        ...prev(),
        {
          id: 'example-data-source-action',
          getDisplayName: () => 'Example data source action',
          getIconType: () => 'plus',
          execute: () => {
            alert('Example data source action executed');
          },
        },
        {
          id: 'another-example-data-source-action',
          getDisplayName: () => 'Another example data source action',
          getIconType: () => 'minus',
          execute: () => {
            alert('Another example data source action executed');
          },
          isCompatible: ({ field }) => field.name !== 'message',
        },
      ],
  },
  resolve: (params) => {
    let indexPattern: string | undefined;

    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return { isMatch: false };
      }

      indexPattern = getIndexPatternFromESQLQuery(params.query.esql);
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView) && params.dataView) {
      indexPattern = params.dataView.getIndexPattern();
    }

    if (indexPattern !== 'my-example-logs') {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
        formatRecord: (record) => JSON.stringify(record, null, 2),
      },
    };
  },
});
