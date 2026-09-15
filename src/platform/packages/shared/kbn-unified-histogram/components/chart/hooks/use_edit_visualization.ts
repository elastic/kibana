/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSource } from '@kbn/data-source';
import { DataViewSource } from '@kbn/data-source';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VISUALIZE_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UnifiedHistogramServices } from '../../..';

// Avoid taking a dependency on uiActionsPlugin just for this const
const visualizeFieldTrigger: typeof VISUALIZE_FIELD_TRIGGER = 'VISUALIZE_FIELD_TRIGGER';

export const useEditVisualization = ({
  services,
  dataSource,
  relativeTimeRange,
  lensAttributes,
  isPlainRecord,
}: {
  services: UnifiedHistogramServices;
  dataSource: DataSource | undefined;
  relativeTimeRange?: TimeRange;
  lensAttributes?: TypedLensByValueInput['attributes'];
  isPlainRecord?: boolean;
}) => {
  const [canVisualize, setCanVisualize] = useState(false);

  const checkCanVisualize = useCallback(async () => {
    if (!dataSource?.id || isPlainRecord) {
      return false;
    }

    if (!(dataSource instanceof DataViewSource)) {
      return false;
    }

    const dataView = dataSource.getDataView();

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
  }, [dataSource, isPlainRecord, services.uiActions]);

  const onEditVisualization = useMemo(() => {
    if (!canVisualize || !lensAttributes) {
      return undefined;
    }

    return () => {
      services.lens.navigateToPrefilledEditor({
        id: '',
        time_range: relativeTimeRange,
        attributes: lensAttributes,
      });
    };
  }, [canVisualize, lensAttributes, relativeTimeRange, services.lens]);

  useEffect(() => {
    checkCanVisualize().then(setCanVisualize);
  }, [checkCanVisualize]);

  return onEditVisualization;
};
