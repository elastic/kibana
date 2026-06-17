/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AppMenuRegistry } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import type { DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import { DATA_QUALITY_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { AlertConsumers, OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { isOfQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import type { RootProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { AlertsLegacyRuleType, AppMenuExtensionParams } from '../../../..';

export const createGetAppMenu =
  (services: ProfileProviderServices): RootProfileProvider['profile']['getAppMenu'] =>
  (prev) =>
  (params) => {
    const prevValue = prev(params);
    const showCreateRuleV2 = params.isEsqlMode && Boolean(services.alertingVTwo);

    return {
      getAlertsLegacyRuleTypes: showCreateRuleV2
        ? () => getObservabilityAlertsClassicRuleTypes(services, params)
        : undefined,
      appMenuRegistry: (registry) => {
        registerDatasetQualityLink(registry, services);

        // When alerting v2 is enabled, Discover owns the alerts menu directly (v2 flyout).
        // Registering popover items here would override that and hide the v2 experience.
        if (!showCreateRuleV2) {
          registerCustomThresholdRuleAction(registry, services, params);
          registerCreateSLOAction(registry, services, params);
        }

        return prevValue.appMenuRegistry(registry);
      },
    };
  };

const getObservabilityAlertsClassicRuleTypes = (
  services: ProfileProviderServices,
  params: AppMenuExtensionParams
): AlertsLegacyRuleType[] => {
  const classicRuleTypes: AlertsLegacyRuleType[] = [];

  const customThresholdRule = buildCustomThresholdClassicRuleType(services, params);
  if (customThresholdRule) {
    classicRuleTypes.push(customThresholdRule);
  }

  const createSloRule = buildCreateSloClassicRuleType(services, params);
  if (createSloRule) {
    classicRuleTypes.push(createSloRule);
  }

  return classicRuleTypes;
};

const registerDatasetQualityLink = (
  registry: AppMenuRegistry,
  { share, timefilter }: ProfileProviderServices
) => {
  const dataQualityLocator =
    share?.url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);

  if (dataQualityLocator) {
    registry.registerItem({
      id: 'dataset-quality-link',
      label: i18n.translate('discover.observabilitySolution.appMenu.datasets', {
        defaultMessage: 'Data sets',
      }),
      order: 5,
      iconType: 'database',
      testId: 'discoverAppMenuDatasetQualityLink',
      run: ({ context: { onFinishAction } }) => {
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
    });
  }
};

const buildCustomThresholdClassicRuleType = (
  {
    data,
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
    ...services
  }: ProfileProviderServices,
  { dataView, authorizedRuleTypeIds }: AppMenuExtensionParams
): AlertsLegacyRuleType | undefined => {
  if (!authorizedRuleTypeIds.includes(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID)) {
    return undefined;
  }

  return {
    id: 'custom-threshold-rule',
    label: i18n.translate('discover.observabilitySolution.appMenu.customThresholdRule', {
      defaultMessage: 'Create custom threshold rule',
    }),
    'data-test-subj': 'discoverAppMenuCustomThresholdRule',
    render: (onClose) => {
      const index = dataView?.toMinimalSpec();
      const { filters, query } = data.query.getState();

      const plugins = { ...services, data };
      // Some of the rule form's required plugins are from x-pack, so make sure they're defined before
      // rendering the flyout. The alerting plugin is also part of x-pack, so this check should probably never
      // return false. This is mostly here because Typescript requires us to mark x-pack plugins as optional.
      if (!isValidRuleFormPlugins(plugins)) {
        return null;
      }

      return (
        <RuleFormFlyout
          plugins={{
            ...plugins,
            ruleTypeRegistry,
            actionTypeRegistry,
          }}
          consumer={AlertConsumers.ALERTS}
          validConsumers={[
            AlertConsumers.LOGS,
            AlertConsumers.INFRASTRUCTURE,
            AlertConsumers.OBSERVABILITY,
            AlertConsumers.STACK_ALERTS,
            AlertConsumers.ALERTS,
          ]}
          multiConsumerSelection={AlertConsumers.ALERTS}
          ruleTypeId={OBSERVABILITY_THRESHOLD_RULE_TYPE_ID}
          initialValues={{
            params: {
              searchConfiguration: {
                index,
                query,
                filter: filters,
              },
            },
          }}
          onSubmit={onClose}
          onCancel={onClose}
        />
      );
    },
  };
};

const registerCustomThresholdRuleAction = (
  registry: AppMenuRegistry,
  services: ProfileProviderServices,
  params: AppMenuExtensionParams
) => {
  const classicRuleType = buildCustomThresholdClassicRuleType(services, params);
  if (!classicRuleType) {
    return;
  }

  registry.registerPopoverItem(AppMenuActionId.alerts, {
    id: classicRuleType.id,
    order: 2,
    iconType: 'bell',
    testId: classicRuleType['data-test-subj'] ?? classicRuleType.id,
    label: classicRuleType.label,
    run: ({ context: { onFinishAction } }) => classicRuleType.render(onFinishAction),
  });
};

const buildCreateSloClassicRuleType = (
  allServices: ProfileProviderServices,
  { dataView, isEsqlMode }: AppMenuExtensionParams
): AlertsLegacyRuleType | undefined => {
  const { data, discoverShared, application } = allServices;
  const sloFeature = discoverShared.features.registry.getById('observability-create-slo');
  const hasSloPermission = application.capabilities.slo?.write;

  if (!sloFeature || !hasSloPermission) {
    return undefined;
  }

  return {
    id: 'create-slo',
    label: i18n.translate('discover.observabilitySolution.appMenu.slo', {
      defaultMessage: 'Create SLO',
    }),
    'data-test-subj': 'discoverAppMenuCreateSlo',
    render: (onClose): React.ReactElement | null => {
      const index = dataView?.getIndexPattern();
      const timestampField = dataView?.timeFieldName;
      const { filters, query: kqlQuery } = data.query.getState();

      const filter = isEsqlMode
        ? {}
        : {
            kqlQuery: isOfQueryType(kqlQuery) ? kqlQuery.query : '',
            filters: filters?.map(({ meta, query }) => ({ meta, query })),
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
        onClose,
      }) as React.ReactElement | null;
    },
  };
};

const registerCreateSLOAction = (
  registry: AppMenuRegistry,
  services: ProfileProviderServices,
  params: AppMenuExtensionParams
) => {
  const classicRuleType = buildCreateSloClassicRuleType(services, params);
  if (!classicRuleType) {
    return;
  }

  registry.registerPopoverItem(AppMenuActionId.alerts, {
    id: classicRuleType.id,
    order: 3,
    iconType: 'chartGauge',
    testId: classicRuleType['data-test-subj'] ?? classicRuleType.id,
    label: classicRuleType.label,
    run: ({ context: { onFinishAction } }) => classicRuleType.render(onFinishAction),
  });
};
