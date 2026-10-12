/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import { ESQLVariableType } from '@kbn/esql-types';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  canAddChangePointChartsToDashboard,
  toChangePointDashboardPackages,
} from './add_page_to_dashboard_packages';

const attributes = { title: 'host-1' } as LensAttributes;

describe('toChangePointDashboardPackages', () => {
  it('creates one by-value Lens package per chart and appends each control once', () => {
    const packages = toChangePointDashboardPackages({
      charts: [
        { attributes },
        { attributes: { ...attributes, title: 'host-2' } as LensAttributes },
      ],
      esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
      controlsState: {
        control1: {
          type: 'esqlControl',
          order: 0,
          width: 'small',
          grow: false,
          fieldName: 'service',
        },
      } as never,
    });

    expect(packages).toEqual([
      {
        type: LENS_EMBEDDABLE_TYPE,
        serializedState: {
          attributes,
          esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
        },
      },
      {
        type: LENS_EMBEDDABLE_TYPE,
        serializedState: {
          attributes: { ...attributes, title: 'host-2' },
          esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
        },
      },
      {
        type: 'esqlControl',
        serializedState: { fieldName: 'service' },
      },
    ]);
    expect(packages.some((pkg) => 'ref_id' in pkg.serializedState)).toBe(false);
    expect(packages.some((pkg) => pkg.size)).toBe(false);
  });
});

describe('canAddChangePointChartsToDashboard', () => {
  it('allows create or edit dashboard access', () => {
    expect(canAddChangePointChartsToDashboard({} as Capabilities)).toBe(false);
    expect(
      canAddChangePointChartsToDashboard({
        dashboard_v2: { createNew: true },
      } as unknown as Capabilities)
    ).toBe(true);
    expect(
      canAddChangePointChartsToDashboard({
        dashboard_v2: { showWriteControls: true },
      } as unknown as Capabilities)
    ).toBe(true);
  });
});
