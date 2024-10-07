/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { isRangeAnnotationConfig } from '../..';
import {
  ConfigPanelApplyAsRangeSwitch,
  ConfigPanelRangeDatePicker,
} from './range_annotation_panel';
import type { ManualEventAnnotationType } from './types';

export const ConfigPanelManualAnnotation = ({
  annotation,
  onChange,
  getDefaultRangeEnd,
  calendarClassName,
}: {
  annotation?: ManualEventAnnotationType | undefined;
  onChange: <T extends ManualEventAnnotationType>(annotation: Partial<T> | undefined) => void;
  getDefaultRangeEnd: (rangeStart: string) => string;
  calendarClassName: string | undefined;
}) => {
  const isRange = isRangeAnnotationConfig(annotation);
  return (
    <>
      {isRange ? (
        <>
          <ConfigPanelRangeDatePicker
            dataTestSubj="lns-xyAnnotation-fromTime"
            calendarClassName={calendarClassName}
            prependLabel={i18n.translate('eventAnnotationComponents.xyChart.annotationDate.from', {
              defaultMessage: 'From',
            })}
            value={moment(annotation?.key.timestamp)}
            onChange={(date) => {
              if (date) {
                const currentEndTime = moment(annotation?.key.endTimestamp).valueOf();
                if (currentEndTime < date.valueOf()) {
                  const currentStartTime = moment(annotation?.key.timestamp).valueOf();
                  const dif = currentEndTime - currentStartTime;
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
                      timestamp: date.toISOString(),
                      endTimestamp: moment(date.valueOf() + dif).toISOString(),
                    },
                  });
                } else {
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
                      timestamp: date.toISOString(),
                    },
                  });
                }
              }
            }}
            label={i18n.translate('eventAnnotationComponents.xyChart.annotationDate', {
              defaultMessage: 'Annotation date',
            })}
          />
          <ConfigPanelRangeDatePicker
            dataTestSubj="lns-xyAnnotation-toTime"
            calendarClassName={calendarClassName}
            prependLabel={i18n.translate('eventAnnotationComponents.xyChart.annotationDate.to', {
              defaultMessage: 'To',
            })}
            value={moment(annotation?.key.endTimestamp)}
            onChange={(date) => {
              if (date) {
                const currentStartTime = moment(annotation?.key.timestamp).valueOf();
                if (currentStartTime > date.valueOf()) {
                  const currentEndTime = moment(annotation?.key.endTimestamp).valueOf();
                  const dif = currentEndTime - currentStartTime;
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
                      endTimestamp: date.toISOString(),
                      timestamp: moment(date.valueOf() - dif).toISOString(),
                    },
                  });
                } else {
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
                      endTimestamp: date.toISOString(),
                    },
                  });
                }
              }
            }}
          />
        </>
      ) : (
        <ConfigPanelRangeDatePicker
          dataTestSubj="lns-xyAnnotation-time"
          calendarClassName={calendarClassName}
          label={i18n.translate('eventAnnotationComponents.xyChart.annotationDate', {
            defaultMessage: 'Annotation date',
          })}
          value={moment(annotation?.key.timestamp)}
          onChange={(date) => {
            if (date) {
              onChange({
                key: {
                  ...(annotation?.key || { type: 'point_in_time' }),
                  timestamp: date.toISOString(),
                },
              });
            }
          }}
        />
      )}
      <ConfigPanelApplyAsRangeSwitch
        annotation={annotation}
        onChange={onChange}
        getDefaultRangeEnd={getDefaultRangeEnd}
      />
    </>
  );
};
