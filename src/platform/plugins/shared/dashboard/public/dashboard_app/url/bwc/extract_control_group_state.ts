/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_IGNORE_VALIDATIONS,
  DEFAULT_USE_GLOBAL_FILTERS,
} from '@kbn/controls-constants';
import type { DashboardState } from '../../../../common';

export function extractControlGroupState(state: { [key: string]: unknown }): {
  controlGroupState?: DashboardState['controlGroupInput'];
  autoApplyFilters?: boolean;
} {
  // >9.3 the `autoApplySelections` control group setting became the `autoApplyFilters` dashboard setting
  let autoApplySelections: boolean = DEFAULT_AUTO_APPLY_SELECTIONS;
  if (typeof state.autoApplySelections === 'boolean') {
    autoApplySelections = state.autoApplySelections;
  } else if (typeof state.showApplySelections === 'boolean') {
    // <8.16 autoApplySelections exported as !showApplySelections
    autoApplySelections = !state.showApplySelections;
  }

  if (
    state.controlGroupState &&
    typeof state.controlGroupState === 'object' &&
    'initialChildControlState' in state.controlGroupState &&
    typeof state.controlGroupState.initialChildControlState === 'object'
  ) {
    // URL state created in 8.16 through 8.18 passed control group runtime state in with controlGroupState key
    const {
      controlGroupState: { initialChildControlState },
    } = state;
    return {
      autoApplyFilters: autoApplySelections,
      controlGroupState: {
        controls:
          typeof initialChildControlState === 'object'
            ? Object.entries(initialChildControlState ?? {})
                .sort(([, value1], [, value2]) => {
                  return value1.order - value2.order;
                })
                .map(([controlId, value]) => {
                  const { grow, order, type, width, ...config } = value; // drop order
                  return {
                    uid: controlId,
                    type,
                    ...(grow !== undefined && { grow }),
                    ...(width !== undefined && { width }),
                    config,
                  };
                })
            : [],
      },
    };
  }

  if (!state.controlGroupInput || typeof state.controlGroupInput !== 'object') {
    return { autoApplyFilters: autoApplySelections, controls: [] };
  }

  const controlGroupInput = state.controlGroupInput as { [key: string]: unknown };
  let standardizedControls: ControlsGroupState['controls'] = [];
  if (controlGroupInput.panels && typeof controlGroupInput.panels === 'object') {
    // <8.16 controls exported as panels
    standardizedControls = Object.keys(controlGroupInput.panels).map((controlId) => {
      const panels = controlGroupInput.panels as {
        [key: string]: { [key: string]: unknown } | undefined;
      };
      const { explicitInput, ...restOfControlState } = panels[controlId] ?? {};
      return {
        ...restOfControlState,
        config: explicitInput,
      };
    }) as ControlsGroupState['controls'];
  } else if (Array.isArray(controlGroupInput.controls)) {
    standardizedControls = controlGroupInput.controls.map((control) => {
      if ('controlConfig' in control) {
        // URL state created in 8.19 up to 9.4 had `config` stored under `controlConfig`
        const { controlConfig, ...rest } = control;
        return { ...rest, config: controlConfig };
      }
      return control;
    });
  }

  if (typeof controlGroupInput.ignoreParentSettings === 'object') {
    // >9.3 control group `ignoreParentSettings` gets translated to individual control settings and/or dashboard settings
    const ignoreParentSettings = controlGroupInput.ignoreParentSettings ?? {};
    const legacyUseGlobalFilters = Boolean(
      ('ignoreFilters' in ignoreParentSettings && ignoreParentSettings.ignoreFilters) ||
        ('ignoreQuery' in ignoreParentSettings && ignoreParentSettings.ignoreQuery)
    );
    standardizedControls.map((control) => ({
      ...control,
      useGlobalFilters: !('useGlobalFilters' in control)
        ? legacyUseGlobalFilters
        : DEFAULT_USE_GLOBAL_FILTERS,
      ignoreValidations:
        'ignoreValidations' in ignoreParentSettings
          ? ignoreParentSettings.ignoreValidations
          : DEFAULT_IGNORE_VALIDATIONS,
    }));
  }

  return {
    autoApplyFilters: autoApplySelections,
    controlGroupState: {
      controls: standardizedControls,
    },
  };
}
