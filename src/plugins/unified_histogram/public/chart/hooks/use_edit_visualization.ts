/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { VISUALIZE_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UnifiedHistogramServices } from '../..';

// Avoid taking a dependency on uiActionsPlugin just for this const
const visualizeFieldTrigger: typeof VISUALIZE_FIELD_TRIGGER = 'VISUALIZE_FIELD_TRIGGER';

export const useEditVisualization = ({
  services,
  dataView,
  relativeTimeRange,
  lensAttributes,
  isPlainRecord,
}: {
  services: UnifiedHistogramServices;
  dataView: DataView;
  relativeTimeRange?: TimeRange;
  lensAttributes?: TypedLensByValueInput['attributes'];
  isPlainRecord?: boolean;
}) => {
  const [canVisualize, setCanVisualize] = useState(false);

  const checkCanVisualize = useCallback(async () => {
    if (!dataView.id || isPlainRecord) {
      return false;
    }
    if (!dataView.isTimeBased() || !dataView.getTimeField().visualizable) {
      return false;
    }

    const compatibleActions = await services.uiActions.getTriggerCompatibleActions(
      visualizeFieldTrigger,
      {
        dataViewSpec: dataView.toSpec(false),
        fieldName: dataView.timeFieldName,
      }
    );

    return Boolean(compatibleActions.length);
  }, [dataView, isPlainRecord, services.uiActions]);

  const onEditVisualization = useMemo(() => {
    if (!canVisualize || !lensAttributes) {
      return undefined;
    }

    return () => {
      services.lens.navigateToPrefilledEditor({
        id: '',
        timeRange: relativeTimeRange,
        attributes: lensAttributes,
      });
    };
  }, [canVisualize, lensAttributes, relativeTimeRange, services.lens]);

  useEffect(() => {
    checkCanVisualize().then(setCanVisualize);
  }, [checkCanVisualize]);

  return onEditVisualization;
};
