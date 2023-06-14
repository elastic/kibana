/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonProps } from '@elastic/eui';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldCategorizeButtonInner } from './field_categorize_button_inner';
import { triggerCategorizeActions, canCategorize } from './categorize_trigger_utils';

export interface FieldCategorizeButtonProps {
  field: DataViewField;
  dataView: DataView;
  originatingApp: string; // plugin id
  uiActions: UiActionsStart;
  contextualFields?: string[]; // names of fields which were also selected (like columns in Discover grid)
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  buttonProps?: Partial<EuiButtonProps>;
  closePopover?: () => void;
}

export const FieldCategorizeButton: React.FC<FieldCategorizeButtonProps> = React.memo(
  ({ field, dataView, trackUiMetric, originatingApp, uiActions, buttonProps, closePopover }) => {
    const handleVisualizeLinkClick = async (
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
    ) => {
      // regular link click. let the uiActions code handle the navigation and show popup if needed
      event.preventDefault();
      const triggerVisualization = (updatedDataView: DataView) => {
        trackUiMetric?.(METRIC_TYPE.CLICK, 'categorize_link_click');
        triggerCategorizeActions(uiActions, field, originatingApp, updatedDataView);
      };
      triggerVisualization(dataView);
      if (closePopover) {
        closePopover();
      }
    };

    return (
      <FieldCategorizeButtonInner
        fieldName={field.name}
        handleVisualizeLinkClick={handleVisualizeLinkClick}
        buttonProps={buttonProps}
      />
    );
  }
);

export async function getFieldCategorizeButton(props: FieldCategorizeButtonProps) {
  const showButton = await canCategorize(props.uiActions, props.field, props.dataView);
  return showButton ? <FieldCategorizeButton {...props} /> : null;
}
