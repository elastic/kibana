/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { Capabilities } from '@kbn/core/public';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';

export const toChangePointDashboardPackages = ({
  charts,
  esqlVariables,
  controlsState,
}: {
  charts: ReadonlyArray<{ attributes: LensAttributes }>;
  esqlVariables?: ESQLControlVariable[];
  controlsState?: ControlPanelsState;
}): EmbeddablePackageState[] => {
  const chartPackages = charts.map(({ attributes }) => ({
    type: LENS_EMBEDDABLE_TYPE,
    serializedState: {
      attributes,
      esqlVariables,
    },
  }));

  const controlPackages = Object.values(controlsState ?? {}).map((control) => ({
    type: control.type,
    serializedState: omit(control, ['type', 'order', 'width', 'grow']),
  }));

  return [...chartPackages, ...controlPackages];
};

export const canAddChangePointChartsToDashboard = (capabilities: Capabilities): boolean => {
  const dashboardCapabilities = capabilities.dashboard_v2 as
    | { showWriteControls?: boolean; createNew?: boolean }
    | undefined;
  return Boolean(dashboardCapabilities?.showWriteControls || dashboardCapabilities?.createNew);
};
