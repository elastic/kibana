/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { range } from 'lodash';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { AlertType } from '../../../../x-pack/plugins/alerting/server';
import {
  DEFAULT_INSTANCES_TO_GENERATE,
  RAC_EXAMPLE_APP_ID,
  AlwaysFiringParams,
  AlwaysFiringActionGroupIds,
} from '../../common/constants';

import { PluginSetupContract } from '../../../../x-pack/plugins/alerting/server';
import { BackendLibs } from '../types';

import {
  AlertInstanceState,
  AlertInstanceContext,
} from '../../../../x-pack/plugins/alerting/common';
import { AlertTypeState, AlertInstance } from '../../../../x-pack/plugins/alerting/server';

type ActionGroups = 'small' | 'medium' | 'large';
const DEFAULT_ACTION_GROUP: ActionGroups = 'small';

function getTShirtSizeByIdAndThreshold(
  id: string,
  thresholds: AlwaysFiringParams['thresholds']
): ActionGroups {
  const idAsNumber = parseInt(id, 10);
  if (!isNaN(idAsNumber)) {
    if (thresholds?.large && thresholds.large < idAsNumber) {
      return 'large';
    }
    if (thresholds?.medium && thresholds.medium < idAsNumber) {
      return 'medium';
    }
    if (thresholds?.small && thresholds.small < idAsNumber) {
      return 'small';
    }
  }
  return DEFAULT_ACTION_GROUP;
}

type AlwaysFiringAlertInstance = AlertInstance<
  AlertInstanceState,
  AlertInstanceContext,
  ActionGroups
>;

type AlertInstanceFactory = (
  id: string,
  reason: string,
  threshold?: number | undefined,
  value?: number | undefined
) => AlwaysFiringAlertInstance;

export const createAlertsDemoExecutor = (libs: BackendLibs) =>
  libs.rules.createLifecycleRuleExecutor<
    AlwaysFiringParams,
    AlertTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    AlwaysFiringActionGroupIds
  >(async function ({
    services,
    params: { instances = DEFAULT_INSTANCES_TO_GENERATE, thresholds },
  }) {
    const { alertWithLifecycle } = services;
    const alertInstanceFactory: AlertInstanceFactory = (id, reason) =>
      alertWithLifecycle({
        id,
        fields: {
          [ALERT_REASON]: reason,
        },
      });

    range(instances)
      .map(() => uuid.v4())
      .forEach((id: string) => {
        const tShirtSize = getTShirtSizeByIdAndThreshold(id, thresholds);
        alertInstanceFactory(id, tShirtSize).scheduleActions(tShirtSize);
      });
  });

export const registerAlwaysFiringRuleType = (
  alertingPlugin: PluginSetupContract,
  libs: BackendLibs
) =>
  alertingPlugin.registerType({
    id: 'example.always-firing-demo',
    name: 'Always firing demo',
    validate: {},
    defaultActionGroupId: DEFAULT_ACTION_GROUP,
    actionGroups: [
      { id: 'small', name: 'Small t-shirt' },
      { id: 'medium', name: 'Medium t-shirt' },
      { id: 'large', name: 'Large t-shirt' },
    ],
    isExportable: true,
    executor: createAlertsDemoExecutor(libs),
    minimumLicenseRequired: 'basic',
    producer: RAC_EXAMPLE_APP_ID,
  });

export const alertType: AlertType<
  AlwaysFiringParams,
  never,
  { count?: number },
  { triggerdOnCycle: number },
  never,
  AlwaysFiringActionGroupIds
> = {
  id: 'example.always-firing-demo',
  name: 'Always firing demo',
  actionGroups: [
    { id: 'small', name: 'Small t-shirt' },
    { id: 'medium', name: 'Medium t-shirt' },
    { id: 'large', name: 'Large t-shirt' },
  ],
  defaultActionGroupId: DEFAULT_ACTION_GROUP,
  minimumLicenseRequired: 'basic',
  isExportable: true,
  async executor({
    services,
    params: { instances = DEFAULT_INSTANCES_TO_GENERATE, thresholds },
    state,
  }) {
    const count = (state ? state.count ?? 0 : 0) + 1;

    range(instances)
      .map(() => uuid.v4())
      .forEach((id: string) => {
        services
          .alertInstanceFactory(id)
          .replaceState({ triggerdOnCycle: count })
          .scheduleActions(getTShirtSizeByIdAndThreshold(id, thresholds));
      });

    return {
      count,
    };
  },
  producer: RAC_EXAMPLE_APP_ID,
};
