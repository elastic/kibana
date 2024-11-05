/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuActionId, AppMenuActionType, AppMenuRegistry } from '@kbn/discover-utils';
import { DATA_QUALITY_LOCATOR_ID, DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { isOfQueryType } from '@kbn/es-query';
import { AppMenuExtensionParams } from '../../../..';
import type { RootProfileProvider } from '../../../../profiles';
import { ProfileProviderServices } from '../../../profile_provider_services';

export const createGetAppMenu =
  (services: ProfileProviderServices): RootProfileProvider['profile']['getAppMenu'] =>
  (prev) =>
  (params) => {
    const prevValue = prev(params);

    return {
      appMenuRegistry: (registry) => {
        // Register custom link actions
        registerDatasetQualityLink(registry, services);
        // Register alerts sub menu actions
        registerCreateSLOAction(registry, services, params);
        registerCustomThresholdRuleAction(registry, services, params);

        return prevValue.appMenuRegistry(registry);
      },
    };
  };

const registerDatasetQualityLink = (
  registry: AppMenuRegistry,
  { share, timefilter }: ProfileProviderServices
) => {
  const dataQualityLocator =
    share?.url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);

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

          onFinishAction();
        },
      },
    });
  }
};

const registerCustomThresholdRuleAction = (
  registry: AppMenuRegistry,
  { data, triggersActionsUi }: ProfileProviderServices,
  { dataView }: AppMenuExtensionParams
) => {
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
        const { filters, query } = data.query.getState();

        return triggersActionsUi.getAddRuleFlyout({
          consumer: 'logs',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          canChangeTrigger: false,
          initialValues: {
            params: {
              searchConfiguration: {
                index,
                query,
                filter: filters,
              },
            },
          },
          onClose: onFinishAction,
        });
      },
    },
  });
};

const registerCreateSLOAction = (
  registry: AppMenuRegistry,
  { data, discoverShared }: ProfileProviderServices,
  { dataView, isEsqlMode }: AppMenuExtensionParams
) => {
  const sloFeature = discoverShared.features.registry.getById('observability-create-slo');

  if (sloFeature) {
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
          const timestampField = dataView?.timeFieldName;
          const { filters, query } = data.query.getState();

          const filter = isEsqlMode
            ? {}
            : {
                kqlQuery: isOfQueryType(query) ? query.query : '',
                filters,
              };

          return sloFeature.createSLOFlyout({
            initialValues: {
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  index,
                  timestampField,
                  filter,
                },
              },
            },
            onClose: onFinishAction,
          });
        },
      },
    });
  }
};
