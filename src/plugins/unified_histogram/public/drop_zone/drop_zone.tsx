/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { DragContextState, DragDrop, DropOverlayWrapper, DropType } from '@kbn/dom-drag-drop';
import { fieldSupportsBreakdown } from '../chart/utils/field_supports_breakdown';

const DROP_PROPS = {
  value: {
    id: 'dropZoneBreakdown',
    humanData: {
      label: i18n.translate('unifiedHistogram.dropZoneBreakdownLabel', {
        defaultMessage: 'Drop zone to set a breakdown field',
      }),
    },
  },
  order: [2, 0, 0, 0],
  types: ['field_add'] as DropType[],
};

interface DropZoneProps {
  dataView: DataView;
  isPlainRecord?: boolean;
  dragDropContext?: DragContextState;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
}

/**
 * Drop zone for the whole char area
 * @param dataView
 * @param isPlainRecord
 * @param dragDropContext
 * @param onBreakdownFieldChange
 * @param children
 * @constructor
 */
export const DropZone: React.FC<DropZoneProps> = ({
  dataView,
  isPlainRecord,
  dragDropContext,
  onBreakdownFieldChange,
  children,
}) => {
  const draggingFieldName = dragDropContext?.dragging?.id;

  const onDropFieldToBreakdown = useMemo(() => {
    if (!draggingFieldName || !onBreakdownFieldChange) {
      return undefined;
    }

    const dataViewField = dataView.getFieldByName(draggingFieldName);

    if (!dataViewField || !fieldSupportsBreakdown(dataViewField)) {
      return undefined;
    }

    return () => {
      onBreakdownFieldChange(dataViewField);
    };
  }, [onBreakdownFieldChange, draggingFieldName, dataView]);

  const isDropAllowed = Boolean(onDropFieldToBreakdown);

  return (
    <DragDrop
      isDisabled={isPlainRecord}
      draggable={false}
      dragDropContext={dragDropContext}
      dropTypes={isDropAllowed ? DROP_PROPS.types : undefined}
      value={DROP_PROPS.value}
      order={DROP_PROPS.order}
      onDrop={onDropFieldToBreakdown}
    >
      <DropOverlayWrapper isVisible={isDropAllowed}>
        <div data-test-subj="unifiedHistogramChartDropZone" className="eui-fullHeight">
          {children}
        </div>
      </DropOverlayWrapper>
    </DragDrop>
  );
};
