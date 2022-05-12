/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';

import { triggerVisualizeActions, VisualizeInformation } from './lib/visualize_trigger_utils';
import type { FieldDetails } from './types';
import { getVisualizeInformation } from './lib/visualize_trigger_utils';
import { DiscoverFieldVisualizeInner } from './discover_field_visualize_inner';

interface Props {
  field: DataViewField;
  indexPattern: DataView;
  details: FieldDetails;
  multiFields?: DataViewField[];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

export const DiscoverFieldVisualize: React.FC<Props> = React.memo(
  ({ field, indexPattern, details, trackUiMetric, multiFields }) => {
    const [visualizeInfo, setVisualizeInfo] = useState<VisualizeInformation>();

    useEffect(() => {
      getVisualizeInformation(field, indexPattern.id, details.columns, multiFields).then(
        setVisualizeInfo
      );
    }, [details.columns, field, indexPattern, multiFields]);

    if (!visualizeInfo) {
      return null;
    }

    const handleVisualizeLinkClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      // regular link click. let the uiActions code handle the navigation and show popup if needed
      event.preventDefault();
      trackUiMetric?.(METRIC_TYPE.CLICK, 'visualize_link_click');
      triggerVisualizeActions(visualizeInfo.field, indexPattern.id, details.columns);
    };

    return (
      <DiscoverFieldVisualizeInner
        field={field}
        visualizeInfo={visualizeInfo}
        handleVisualizeLinkClick={handleVisualizeLinkClick}
      />
    );
  }
);
