/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { FilterableSource } from '@kbn/data-source';
import { asyncForEach } from '@kbn/std';
import { triggers } from '@kbn/ui-actions-plugin/public';
import { CONTROL_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { CreateControlTypeAction } from '../../../actions/control_panel_actions';

export type ControlTypeContext = Parameters<CreateControlTypeAction['isCompatible']>[0];

/**
 * Which control types fit the field, and the control type to use: the selected one, or the first
 * compatible one when the selected one does not fit the field.
 */
export const useControlType = ({
  controlActionRegistry,
  fieldName,
  source,
  selectedControlType,
}: {
  controlActionRegistry: { [type: string]: CreateControlTypeAction };
  fieldName?: string;
  source?: FilterableSource;
  selectedControlType?: string;
}) => {
  const controlTypeContext: ControlTypeContext = useMemo(
    () => ({
      trigger: triggers[CONTROL_MENU_TRIGGER],
      embeddable: undefined, // parentApi isn't necessary for this
      state: { field_name: fieldName },
      source,
    }),
    [fieldName, source]
  );

  const { loading, value: isCompatible = {} } = useAsync(async () => {
    const compatibility: { [type: string]: boolean } = {};
    await asyncForEach(Object.values(controlActionRegistry), async (action) => {
      compatibility[action.type] = await action.isCompatible(controlTypeContext);
    });
    return compatibility;
  }, [controlActionRegistry, controlTypeContext]);

  const keepSelectedType =
    loading || !source || !fieldName || (selectedControlType && isCompatible[selectedControlType]);
  const controlType = keepSelectedType
    ? selectedControlType
    : Object.values(controlActionRegistry).find(({ type }) => isCompatible[type])?.type ??
      selectedControlType;

  return { controlTypeContext, isCompatible, controlType };
};
