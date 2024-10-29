/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFormRow, EuiSwitch, EuiText, EuiDatePicker } from '@elastic/eui';
import moment from 'moment';
import type {
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import { isRangeAnnotationConfig } from '../..';
import { defaultRangeAnnotationLabel, defaultAnnotationLabel } from './helpers';
import { toLineAnnotationColor, toRangeAnnotationColor } from './helpers';
import type { ManualEventAnnotationType } from './types';

export const ConfigPanelApplyAsRangeSwitch = ({
  annotation,
  onChange,
  getDefaultRangeEnd,
}: {
  annotation?: ManualEventAnnotationType;
  onChange: <T extends ManualEventAnnotationType>(annotations: Partial<T> | undefined) => void;
  getDefaultRangeEnd: (rangeStart: string) => string;
}) => {
  const isRange = isRangeAnnotationConfig(annotation);
  return (
    <EuiFormRow display="columnCompressed" className="lnsRowCompressedMargin">
      <EuiSwitch
        data-test-subj="lns-xyAnnotation-rangeSwitch"
        label={
          <EuiText size="xs">
            {i18n.translate('eventAnnotationComponents.xyChart.applyAsRange', {
              defaultMessage: 'Apply as range',
            })}
          </EuiText>
        }
        checked={isRange}
        onChange={() => {
          if (isRange) {
            const newPointAnnotation: PointInTimeEventAnnotationConfig = {
              type: 'manual',
              key: {
                type: 'point_in_time',
                timestamp: annotation.key.timestamp,
              },
              id: annotation.id,
              label:
                annotation.label === defaultRangeAnnotationLabel
                  ? defaultAnnotationLabel
                  : annotation.label,
              color: toLineAnnotationColor(annotation.color),
              isHidden: annotation.isHidden,
            };
            onChange(newPointAnnotation);
          } else if (annotation) {
            const newRangeAnnotation: RangeEventAnnotationConfig = {
              type: 'manual',
              key: {
                type: 'range',
                timestamp: annotation.key.timestamp,
                endTimestamp: getDefaultRangeEnd(annotation.key.timestamp),
              },
              id: annotation.id,
              label:
                annotation.label === defaultAnnotationLabel
                  ? defaultRangeAnnotationLabel
                  : annotation.label,
              color: toRangeAnnotationColor(annotation.color),
              isHidden: annotation.isHidden,
            };
            onChange(newRangeAnnotation);
          }
        }}
        compressed
      />
    </EuiFormRow>
  );
};

export const ConfigPanelRangeDatePicker = ({
  value,
  label,
  prependLabel,
  onChange,
  calendarClassName,
  dataTestSubj = 'lnsXY_annotation_date_picker',
}: {
  value: moment.Moment;
  prependLabel?: string;
  label?: string;
  onChange: (val: moment.Moment | null) => void;
  calendarClassName: string | undefined;
  dataTestSubj?: string;
}) => {
  return (
    <EuiFormRow
      display="rowCompressed"
      fullWidth
      label={label}
      className="lnsConfigPanelAnnotations__date lnsRowCompressedMargin"
    >
      <EuiDatePicker
        compressed
        calendarClassName={calendarClassName}
        fullWidth
        showTimeSelect
        selected={value}
        onChange={onChange}
        dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
        data-test-subj={dataTestSubj}
        prepend={prependLabel}
      />
    </EuiFormRow>
  );
};
