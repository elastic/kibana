/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './annotations.scss';
import './reference_lines/reference_lines.scss';

import React from 'react';
import { snakeCase } from 'lodash';
import {
  AnnotationDomainType,
  AnnotationTooltipFormatter,
  LineAnnotation,
  Position,
  RectAnnotation,
} from '@elastic/charts';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type {
  ManualPointEventAnnotationArgs,
  ManualRangeEventAnnotationRow,
} from '@kbn/event-annotation-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
} from '@kbn/event-annotation-plugin/public';
import { Datatable, DatatableRow } from '@kbn/expressions-plugin/common';
import { ManualPointEventAnnotationRow } from '@kbn/event-annotation-plugin/common/manual_event_annotation/types';
import type { CollectiveConfig } from '../../common';
import { AnnotationIcon, hasIcon, Marker, MarkerBody } from '../helpers';
import { mapVerticalToHorizontalPlacement, LINES_MARKER_SIZE } from '../helpers';

export interface AnnotationsProps {
  groupedLineAnnotations: CollectiveConfig[];
  rangeAnnotations: ManualRangeEventAnnotationRow[];
  formatter?: FieldFormat;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
  simpleView?: boolean;
  minInterval?: number;
  isBarChart?: boolean;
  outsideDimension: number;
}

const createCustomTooltipDetails =
  (
    config: ManualPointEventAnnotationArgs[],
    formatter?: FieldFormat
  ): AnnotationTooltipFormatter | undefined =>
  () => {
    return (
      <div key={config[0].time}>
        {config.map(({ icon, label, time, color }) => (
          <div className="echTooltip__item--container" key={snakeCase(label)}>
            <EuiFlexGroup className="echTooltip__label" gutterSize="xs">
              {hasIcon(icon) && (
                <EuiFlexItem grow={false}>
                  <AnnotationIcon type={icon} color={color} />
                </EuiFlexItem>
              )}
              <EuiFlexItem> {label}</EuiFlexItem>
            </EuiFlexGroup>
            <span className="echTooltip__value"> {formatter?.convert(time) || String(time)}</span>
          </div>
        ))}
      </div>
    );
  };

function getCommonProperty<T, K extends keyof ManualPointEventAnnotationArgs>(
  configArr: ManualPointEventAnnotationArgs[],
  propertyName: K,
  fallbackValue: T
) {
  const firstStyle = configArr[0][propertyName];
  if (configArr.every((config) => firstStyle === config[propertyName])) {
    return firstStyle;
  }
  return fallbackValue;
}

const getCommonStyles = (configArr: ManualPointEventAnnotationArgs[]) => {
  return {
    color: getCommonProperty<ManualPointEventAnnotationArgs['color'], 'color'>(
      configArr,
      'color',
      defaultAnnotationColor
    ),
    lineWidth: getCommonProperty(configArr, 'lineWidth', 1),
    lineStyle: getCommonProperty(configArr, 'lineStyle', 'solid'),
    textVisibility: getCommonProperty(configArr, 'textVisibility', false),
  };
};

export const isRangeAnnotation = (row: DatatableRow): row is ManualRangeEventAnnotationRow =>
  'type' in row && row.type === 'range';

export const getRangeAnnotations = (datatable: Datatable) =>
  datatable.rows.filter(
    (row): row is ManualRangeEventAnnotationRow => 'type' in row && row.type === 'range'
  );

export const OUTSIDE_RECT_ANNOTATION_WIDTH = 8;
export const OUTSIDE_RECT_ANNOTATION_WIDTH_SUGGESTION = 2;

export const getAnnotationsGroupedByInterval = (
  annotations: ManualPointEventAnnotationRow[],
  formatter?: FieldFormat
) => {
  const visibleGroupedConfigs = annotations.reduce<Record<string, ManualPointEventAnnotationRow[]>>(
    (acc, current) => {
      const timebucket = moment(current.timebucket).valueOf();
      return {
        ...acc,
        [timebucket]: acc[timebucket] ? [...acc[timebucket], current] : [current],
      };
    },
    {}
  );
  let collectiveConfig: CollectiveConfig;
  return Object.entries(visibleGroupedConfigs).map(([timebucket, configArr]) => {
    collectiveConfig = {
      ...configArr[0],
      icon: configArr[0].icon || 'triangle',
      timebucket: Number(timebucket),
      position: 'bottom',
    };
    if (configArr.length > 1) {
      const commonStyles = getCommonStyles(configArr);
      collectiveConfig = {
        ...collectiveConfig,
        ...commonStyles,
        icon: String(configArr.length),
        customTooltipDetails: createCustomTooltipDetails(configArr, formatter),
      };
    }
    return collectiveConfig;
  });
};

// todo: remove when closed https://github.com/elastic/elastic-charts/issues/1647
RectAnnotation.displayName = 'RectAnnotation';

export const Annotations = ({
  groupedLineAnnotations,
  rangeAnnotations,
  formatter,
  isHorizontal,
  paddingMap,
  simpleView,
  minInterval,
  isBarChart,
  outsideDimension,
}: AnnotationsProps) => {
  return (
    <>
      {groupedLineAnnotations.map((annotation) => {
        const markerPositionVertical = Position.Top;
        const markerPosition = isHorizontal
          ? mapVerticalToHorizontalPlacement(markerPositionVertical)
          : markerPositionVertical;
        const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;
        const id = snakeCase(`${annotation.id}-${annotation.time}`);
        const { timebucket, time } = annotation;
        const isGrouped = Boolean(annotation.customTooltipDetails);
        const header =
          formatter?.convert(isGrouped ? timebucket : time) ||
          moment(isGrouped ? timebucket : time).toISOString();
        const strokeWidth = simpleView ? 1 : annotation.lineWidth || 1;
        const dataValue = isGrouped
          ? moment(isBarChart && minInterval ? timebucket + minInterval / 2 : timebucket).valueOf()
          : moment(time).valueOf();
        return (
          <LineAnnotation
            id={id}
            key={id}
            domainType={AnnotationDomainType.XDomain}
            marker={
              !simpleView ? (
                <Marker
                  {...{
                    config: annotation,
                    isHorizontal: !isHorizontal,
                    hasReducedPadding,
                    label: annotation.label,
                    rotateClassName: isHorizontal ? 'xyAnnotationIcon_rotate90' : undefined,
                  }}
                />
              ) : undefined
            }
            markerBody={
              !simpleView ? (
                <MarkerBody
                  label={
                    annotation.textVisibility && !hasReducedPadding ? annotation.label : undefined
                  }
                  isHorizontal={!isHorizontal}
                />
              ) : undefined
            }
            markerPosition={markerPosition}
            dataValues={[
              {
                dataValue,
                header,
                details: annotation.label,
              },
            ]}
            customTooltipDetails={annotation.customTooltipDetails}
            style={{
              line: {
                strokeWidth,
                stroke: annotation.color || defaultAnnotationColor,
                dash:
                  annotation.lineStyle === 'dashed'
                    ? [strokeWidth * 3, strokeWidth]
                    : annotation.lineStyle === 'dotted'
                    ? [strokeWidth, strokeWidth]
                    : undefined,
                opacity: 1,
              },
            }}
          />
        );
      })}
      {rangeAnnotations.map(({ id, label, time, color, endTime, outside }) => {
        return (
          <RectAnnotation
            id={id}
            key={id}
            customTooltip={() => (
              <div className="echTooltip">
                <EuiText size="xs" className="echTooltip__header">
                  <h4>
                    {formatter
                      ? `${formatter.convert(time)} — ${formatter?.convert(endTime)}`
                      : `${moment(time).toISOString()} — ${moment(endTime).toISOString()}`}
                  </h4>
                </EuiText>
                <div className="xyAnnotationTooltipDetail">{label}</div>
              </div>
            )}
            dataValues={[
              {
                coordinates: {
                  x0: moment(time).valueOf(),
                  x1: moment(endTime).valueOf(),
                },
                details: label,
              },
            ]}
            style={{ fill: color || defaultAnnotationRangeColor, opacity: 1 }}
            outside={Boolean(outside)}
            outsideDimension={outsideDimension}
          />
        );
      })}
    </>
  );
};
