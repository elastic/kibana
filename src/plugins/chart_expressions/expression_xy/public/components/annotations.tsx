/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './annotations.scss';
import './reference_lines/reference_lines.scss';

import React, { Fragment } from 'react';
import { groupBy, snakeCase } from 'lodash';
import {
  AnnotationDomainType,
  AnnotationTooltipFormatter,
  LineAnnotation,
  Position,
  RectAnnotation,
} from '@elastic/charts';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type {
  EventAnnotationOutput,
  ManualPointEventAnnotationArgs,
  ManualRangeEventAnnotationRow,
} from '@kbn/event-annotation-plugin/common';
import type { FieldFormat, FormatFactory } from '@kbn/field-formats-plugin/common';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
} from '@kbn/event-annotation-plugin/public';
import { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { PointEventAnnotationRow } from '@kbn/event-annotation-plugin/common/manual_event_annotation/types';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MergedAnnotation } from '../../common';
import { AnnotationIcon, hasIcon, Marker, MarkerBody } from '../helpers';
import { mapVerticalToHorizontalPlacement, LINES_MARKER_SIZE } from '../helpers';

export interface AnnotationsProps {
  groupedLineAnnotations: MergedAnnotation[];
  rangeAnnotations: ManualRangeEventAnnotationRow[];
  formatter?: FieldFormat;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
  simpleView?: boolean;
  minInterval?: number;
  isBarChart?: boolean;
  outsideDimension: number;
}

const TooltipAnnotationHeader = ({
  row: { label, color, icon },
}: {
  row: PointEventAnnotationRow;
}) => (
  <div className="echTooltip__item--container" key={snakeCase(label)}>
    <EuiFlexGroup className="echTooltip__label" gutterSize="xs">
      {hasIcon(icon) && (
        <EuiFlexItem grow={false}>
          <AnnotationIcon type={icon} color={color} />
        </EuiFlexItem>
      )}
      <EuiFlexItem> {label}</EuiFlexItem>
    </EuiFlexGroup>
  </div>
);

const TooltipAnnotationDetails = ({
  row,
  extraFields,
  timeFormat,
}: {
  row: PointEventAnnotationRow;
  extraFields: Array<{
    key: string;
    name: string;
    formatter: FieldFormat | undefined;
  }>;
  timeFormat: string;
}) => {
  return (
    <div className="echTooltip__item--container">
      <span className="echTooltip__value">
        <div>{moment(row.time).format(timeFormat)}</div>
        <div className="xyAnnotationTooltip__extraFields">
          {extraFields.map((field) => (
            <div>
              {field.name}:{' '}
              {field.formatter ? field.formatter.convert(row[field.key]) : row[field.key]}
            </div>
          ))}
        </div>
      </span>
    </div>
  );
};

const getExtraFields = (
  row: PointEventAnnotationRow,
  formatFactory: FormatFactory,
  columns: DatatableColumn[] | undefined
) => {
  return Object.keys(row)
    .filter((key) => key.startsWith('field:'))
    .map((key) => {
      const columnFormatter = columns?.find((c) => c.id === key)?.meta?.params;
      return {
        key,
        name: key.replace('field:', ''),
        formatter: columnFormatter && formatFactory(columnFormatter),
      };
    });
};

const createCustomTooltipDetails =
  (
    rows: PointEventAnnotationRow[],
    formatFactory: FormatFactory,
    columns: DatatableColumn[] | undefined,
    timeFormat: string
  ): AnnotationTooltipFormatter =>
  () => {
    const groupedConfigs = groupBy(rows, 'id');
    const lastElement = rows[rows.length - 1];
    return (
      <div key={rows[0].time} className="xyAnnotationTooltip">
        {Object.values(groupedConfigs).map((group) => {
          const firstElement = group[0];
          const extraFields = getExtraFields(firstElement, formatFactory, columns);

          return (
            <div className="xyAnnotationTooltip__group" key={firstElement.time}>
              <TooltipAnnotationHeader row={firstElement} />
              <EuiPanel
                color="subdued"
                hasShadow={false}
                paddingSize="xs"
                borderRadius="none"
                hasBorder={true}
              >
                {group.map((row, index) => (
                  <Fragment key={`${row.id}-${row.time}`}>
                    {index > 0 && (
                      <>
                        <EuiSpacer size="xs" />
                        <EuiHorizontalRule margin="none" />
                        <EuiSpacer size="xs" />
                      </>
                    )}
                    <TooltipAnnotationDetails
                      key={snakeCase(row.time)}
                      row={row}
                      extraFields={extraFields}
                      timeFormat={timeFormat}
                    />
                  </Fragment>
                ))}
              </EuiPanel>
            </div>
          );
        })}
        {lastElement.skippedCount && (
          <div className="echTooltip__value">
            <FormattedMessage
              id="expressionXY.annotations.skippedCount"
              defaultMessage="... +{value} more"
              values={{ value: lastElement.skippedCount }}
            />
          </div>
        )}
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
  annotations: PointEventAnnotationRow[],
  configs: EventAnnotationOutput[] | undefined,
  columns: DatatableColumn[] | undefined,
  formatFactory: FormatFactory,
  timeFormat: string
) => {
  const visibleGroupedConfigs = annotations.reduce<Record<string, PointEventAnnotationRow[]>>(
    (acc, current) => {
      const timebucket = moment(current.timebucket).valueOf();
      return {
        ...acc,
        [timebucket]: acc[timebucket] ? [...acc[timebucket], current] : [current],
      };
    },
    {}
  );
  return Object.entries(visibleGroupedConfigs).map(([timebucket, rowsPerBucket]) => {
    const firstRow = rowsPerBucket[0];

    const config = configs?.find((c) => c.id === firstRow.id);
    const textField = config && 'textField' in config && config?.textField;
    const columnFormatter = columns?.find((c) => c.id === `field:${textField}`)?.meta?.params;
    const formatter = columnFormatter && formatFactory(columnFormatter);
    const label =
      textField && formatter && `field:${textField}` in firstRow
        ? formatter.convert(firstRow[`field:${textField}`])
        : firstRow.label;
    const mergedAnnotation: MergedAnnotation = {
      ...firstRow,
      label,
      icon: firstRow.icon || 'triangle',
      timebucket: Number(timebucket),
      position: 'bottom',
      customTooltipDetails: createCustomTooltipDetails(
        rowsPerBucket,
        formatFactory,
        columns,
        timeFormat
      ),
      isGrouped: false,
    };
    if (rowsPerBucket.length > 1) {
      const commonStyles = getCommonStyles(rowsPerBucket);
      return {
        ...mergedAnnotation,
        ...commonStyles,
        isGrouped: true,
        icon: String(rowsPerBucket.length),
      };
    }
    return mergedAnnotation;
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
        const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;
        const { timebucket, time, isGrouped, id: configId } = annotation;
        const strokeWidth = simpleView ? 1 : annotation.lineWidth || 1;
        const id = snakeCase(`${configId}-${time}`);
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
                    label: !isGrouped ? annotation.label : undefined,
                    rotateClassName: isHorizontal ? 'xyAnnotationIcon_rotate90' : undefined,
                  }}
                />
              ) : undefined
            }
            markerBody={
              !simpleView ? (
                <MarkerBody
                  label={
                    !isGrouped && annotation.textVisibility && !hasReducedPadding
                      ? annotation.label
                      : undefined
                  }
                  isHorizontal={!isHorizontal}
                />
              ) : undefined
            }
            markerPosition={
              isHorizontal
                ? mapVerticalToHorizontalPlacement(markerPositionVertical)
                : markerPositionVertical
            }
            dataValues={[
              {
                dataValue: isGrouped
                  ? moment(
                      isBarChart && minInterval ? timebucket + minInterval / 2 : timebucket
                    ).valueOf()
                  : moment(time).valueOf(),
                header:
                  formatter?.convert(isGrouped ? timebucket : time) ||
                  moment(isGrouped ? timebucket : time).toISOString(),
                details: annotation.label,
              },
            ]}
            customTooltipDetails={annotation.customTooltipDetails}
            placement={'bottom'}
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
