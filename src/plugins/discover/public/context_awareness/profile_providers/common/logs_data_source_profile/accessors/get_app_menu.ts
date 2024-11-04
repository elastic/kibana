/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuActionId, AppMenuActionType } from '@kbn/discover-utils';
import {
  DATA_QUALITY_LOCATOR_ID,
  DataQualityLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { DataSourceProfileProvider } from '../../../../profiles';
import { ProfileProviderServices } from '../../../profile_provider_services';

export const createGetAppMenu =
  (services: ProfileProviderServices): DataSourceProfileProvider['profile']['getAppMenu'] =>
  (prev) =>
  (params) => {
    const prevValue = prev(params);

    // This is what is available via params:
    const { dataView } = params;
    const { share, slo, timefilter, triggersActionsUi } = services;

    return {
      appMenuRegistry: (registry) => {
        const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
          OBSERVABILITY_ONBOARDING_LOCATOR
        );

        const dataQualityLocator =
          share?.url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);

        if (onboardingLocator) {
          registry.registerCustomAction({
            id: 'add-data-action',
            type: AppMenuActionType.custom,
            controlProps: {
              label: 'Add data',
              testId: 'add-data-action',
              onClick: ({ onFinishAction }) => {
                onboardingLocator.navigate({ category: 'logs' });

                onFinishAction(); // This allows to return focus back to the app menu DOM node
              },
            },
          });
        }

        if (dataQualityLocator) {
          registry.registerCustomAction({
            id: 'dataset-quality-link',
            type: AppMenuActionType.custom,
            controlProps: {
              label: 'Data sets',
              testId: 'dataset-quality-link',
              onClick: ({ onFinishAction }) => {
                const refresh = timefilter.getRefreshInterval();
                const { from, to } = timefilter.getTime();

                dataQualityLocator.navigate({
                  filters: {
                    timeRange: {
                      from: from ?? 'now-24h',
                      to: to ?? 'now',
                      refresh,
                    },
                  },
                });

                onFinishAction(); // This allows to return focus back to the app menu DOM node
              },
            },
          });
        }

        // This example shows how to add a custom action under the Alerts submenu
        registry.registerCustomActionUnderSubmenu(AppMenuActionId.alerts, {
          // It's also possible to override the submenu actions by using the same id
          // as `AppMenuActionId.createRule` or `AppMenuActionId.manageRulesAndConnectors`
          id: AppMenuActionId.createRule,
          type: AppMenuActionType.custom,
          order: 101,
          controlProps: {
            label: 'Create custom threshold rule',
            iconType: 'visGauge',
            testId: 'custom-threshold-rule',
            onClick: ({ onFinishAction }) => {
              const index = dataView?.getIndexPattern();

              return triggersActionsUi.getAddRuleFlyout({
                consumer: 'logs',
                ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
                canChangeTrigger: false,
                initialValues: {
                  params: {
                    searchConfiguration: {
                      index,
                      // query: getQuery(logsExplorerState.query),
                      // filter: getDiscoverFiltersFromState(
                      //   index.id,
                      //   logsExplorerState.filters,
                      //   logsExplorerState.controls
                      // ),
                    },
                  },
                },
                onClose: onFinishAction,
              });
            },
          },
        });

        registry.registerCustomActionUnderSubmenu(AppMenuActionId.alerts, {
          // It's also possible to override the submenu actions by using the same id
          // as `AppMenuActionId.createRule` or `AppMenuActionId.manageRulesAndConnectors`
          id: 'create-slo',
          type: AppMenuActionType.custom,
          order: 102,
          controlProps: {
            label: 'Create SLO',
            iconType: 'bell',
            testId: 'create-slo',
            onClick: ({ onFinishAction }) => {
              const index = dataView?.getIndexPattern();

              return slo.getCreateSLOFlyout({
                initialValues: {
                  indicator: {
                    type: 'sli.kql.custom',
                    params: {
                      index,
                      timestampField: dataView?.timeFieldName,
                      // filter: {
                      //   kqlQuery: query,
                      //   filters: getDiscoverFiltersFromState(
                      //     dataView.id,
                      //     logsExplorerState.filters,
                      //     logsExplorerState.controls
                      //   ),
                      // },
                    },
                  },
                  // groupBy: logsExplorerState.chart.breakdownField ?? undefined,
                },
                onClose: onFinishAction,
              });
            },
          },
        });

        return prevValue.appMenuRegistry(registry);
      },
    };
  };
