/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonProps } from '@elastic/eui';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldVisualizeButtonInner } from './field_visualize_button_inner';
import {
  triggerVisualizeActions,
  getVisualizeInformation,
  type VisualizeInformation,
} from './visualize_trigger_utils';

export interface FieldVisualizeButtonProps {
  field: DataViewField;
  dataView: DataView;
  originatingApp: string; // plugin id
  uiActions: UiActionsStart;
  multiFields?: DataViewField[];
  contextualFields?: string[]; // names of fields which were also selected (like columns in Discover grid)
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  buttonProps?: Partial<EuiButtonProps>;
  wrapInContainer?: (element: React.ReactElement) => React.ReactElement;
}

export const FieldVisualizeButton: React.FC<FieldVisualizeButtonProps> = React.memo(
  ({
    field,
    dataView,
    contextualFields,
    trackUiMetric,
    multiFields,
    originatingApp,
    uiActions,
    buttonProps,
    wrapInContainer,
  }) => {
    const [visualizeInfo, setVisualizeInfo] = useState<VisualizeInformation>();

    useEffect(() => {
      getVisualizeInformation(uiActions, field, dataView, contextualFields, multiFields).then(
        setVisualizeInfo
      );
    }, [contextualFields, field, dataView, multiFields, uiActions]);

    if (!visualizeInfo) {
      return null;
    }

    const handleVisualizeLinkClick = async (
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
    ) => {
      // regular link click. let the uiActions code handle the navigation and show popup if needed
      event.preventDefault();

      const triggerVisualization = (updatedDataView: DataView) => {
        trackUiMetric?.(METRIC_TYPE.CLICK, 'visualize_link_click');
        triggerVisualizeActions(
          uiActions,
          visualizeInfo.field,
          contextualFields,
          originatingApp,
          updatedDataView
        );
      };
      triggerVisualization(dataView);
    };

    const element = (
      <FieldVisualizeButtonInner
        field={field}
        visualizeInfo={visualizeInfo}
        handleVisualizeLinkClick={handleVisualizeLinkClick}
        buttonProps={buttonProps}
      />
    );

    return wrapInContainer?.(element) || element;
  }
);
