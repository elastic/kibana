/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './annotations.scss';
import './reference_lines.scss';

import React from 'react';
import { snakeCase } from 'lodash';
import {
  AnnotationDomainType,
  AnnotationTooltipFormatter,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconProps, EuiText } from '@elastic/eui';
import classnames from 'classnames';
import type { EventAnnotationArgs } from '../../../../event_annotation/common';
import type { FieldFormat } from '../../../../field_formats/common';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';
import type {
  AnnotationLayerArgs,
  AnnotationLayerConfigResult,
  IconPosition,
  YAxisMode,
} from '../../common/types';
import { annotationsIconSet, hasIcon, isNumericalString } from '../helpers';
import { mapVerticalToHorizontalPlacement, LINES_MARKER_SIZE } from '../helpers';

const getRoundedTimestamp = (timestamp: number, firstTimestamp?: number, minInterval?: number) => {
  if (!firstTimestamp || !minInterval) {
    return timestamp;
  }
  return timestamp - ((timestamp - firstTimestamp) % minInterval);
};

export interface AnnotationsProps {
  groupedAnnotations: CollectiveConfig[];
  formatter?: FieldFormat;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
  hide?: boolean;
  minInterval?: number;
  isBarChart?: boolean;
}

interface CollectiveConfig extends EventAnnotationArgs {
  roundedTimestamp: number;
  axisMode: 'bottom';
  customTooltipDetails?: AnnotationTooltipFormatter | undefined;
}

const groupVisibleConfigsByInterval = (
  layers: AnnotationLayerArgs[],
  minInterval?: number,
  firstTimestamp?: number
) => {
  return layers
    .flatMap(({ annotations }) => annotations.filter((a) => !a.isHidden))
    .reduce<Record<string, EventAnnotationArgs[]>>((acc, current) => {
      const roundedTimestamp = getRoundedTimestamp(
        moment(current.time).valueOf(),
        firstTimestamp,
        minInterval
      );
      return {
        ...acc,
        [roundedTimestamp]: acc[roundedTimestamp] ? [...acc[roundedTimestamp], current] : [current],
      };
    }, {});
};

const createCustomTooltipDetails =
  (
    config: EventAnnotationArgs[],
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

function getCommonProperty<T, K extends keyof EventAnnotationArgs>(
  configArr: EventAnnotationArgs[],
  propertyName: K,
  fallbackValue: T
) {
  const firstStyle = configArr[0][propertyName];
  if (configArr.every((config) => firstStyle === config[propertyName])) {
    return firstStyle;
  }
  return fallbackValue;
}

const getCommonStyles = (configArr: EventAnnotationArgs[]) => {
  return {
    color: getCommonProperty<EventAnnotationArgs['color'], 'color'>(
      configArr,
      'color',
      defaultAnnotationColor
    ),
    lineWidth: getCommonProperty(configArr, 'lineWidth', 1),
    lineStyle: getCommonProperty(configArr, 'lineStyle', 'solid'),
    textVisibility: getCommonProperty(configArr, 'textVisibility', false),
  };
};

export const getAnnotationsGroupedByInterval = (
  layers: AnnotationLayerConfigResult[],
  minInterval?: number,
  firstTimestamp?: number,
  formatter?: FieldFormat
) => {
  const visibleGroupedConfigs = groupVisibleConfigsByInterval(layers, minInterval, firstTimestamp);
  let collectiveConfig: CollectiveConfig;
  return Object.entries(visibleGroupedConfigs).map(([roundedTimestamp, configArr]) => {
    collectiveConfig = {
      ...configArr[0],
      roundedTimestamp: Number(roundedTimestamp),
      axisMode: 'bottom',
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

export const Annotations = ({
  groupedAnnotations,
  formatter,
  isHorizontal,
  paddingMap,
  hide,
  minInterval,
  isBarChart,
}: AnnotationsProps) => {
  return (
    <>
      {groupedAnnotations.map((annotation) => {
        const markerPositionVertical = Position.Top;
        const markerPosition = isHorizontal
          ? mapVerticalToHorizontalPlacement(markerPositionVertical)
          : markerPositionVertical;
        const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;
        const id = snakeCase(annotation.label);
        const { roundedTimestamp, time: exactTimestamp } = annotation;
        const isGrouped = Boolean(annotation.customTooltipDetails);
        const header =
          formatter?.convert(isGrouped ? roundedTimestamp : exactTimestamp) ||
          moment(isGrouped ? roundedTimestamp : exactTimestamp).toISOString();
        const strokeWidth = annotation.lineWidth || 1;
        return (
          <LineAnnotation
            id={id}
            key={id}
            domainType={AnnotationDomainType.XDomain}
            marker={
              !hide ? (
                <Marker
                  {...{
                    config: annotation,
                    isHorizontal: !isHorizontal,
                    hasReducedPadding,
                    label: annotation.label,
                    rotateClassName: isHorizontal ? 'lnsXyAnnotationIcon_rotate90' : undefined,
                  }}
                />
              ) : undefined
            }
            markerBody={
              !hide ? (
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
                dataValue: moment(
                  isBarChart && minInterval ? roundedTimestamp + minInterval / 2 : roundedTimestamp
                ).valueOf(),
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
    </>
  );
};

export function MarkerBody({
  label,
  isHorizontal,
}: {
  label: string | undefined;
  isHorizontal: boolean;
}) {
  if (!label) {
    return null;
  }
  if (isHorizontal) {
    return (
      <div className="eui-textTruncate" style={{ maxWidth: LINES_MARKER_SIZE * 3 }}>
        {label}
      </div>
    );
  }
  return (
    <div
      className="lnsXyDecorationRotatedWrapper"
      style={{
        width: LINES_MARKER_SIZE,
      }}
    >
      <div
        className="eui-textTruncate lnsXyDecorationRotatedWrapper__label"
        style={{
          maxWidth: LINES_MARKER_SIZE * 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function NumberIcon({ number }: { number: number }) {
  return (
    <EuiFlexGroup
      justifyContent="spaceAround"
      className="lnsXyAnnotationNumberIcon"
      gutterSize="none"
      alignItems="center"
    >
      <EuiText color="ghost" className="lnsXyAnnotationNumberIcon__text">
        {number < 10 ? number : `9+`}
      </EuiText>
    </EuiFlexGroup>
  );
}

export const AnnotationIcon = ({
  type,
  rotateClassName = '',
  isHorizontal,
  renderedInChart,
  ...rest
}: {
  type: string;
  rotateClassName?: string;
  isHorizontal?: boolean;
  renderedInChart?: boolean;
} & EuiIconProps) => {
  if (isNumericalString(type)) {
    return <NumberIcon number={Number(type)} />;
  }
  const iconConfig = annotationsIconSet.find((i) => i.value === type);
  if (!iconConfig) {
    return null;
  }
  return (
    <EuiIcon
      {...rest}
      type={iconConfig.icon || type}
      className={classnames(
        { [rotateClassName]: iconConfig.shouldRotate },
        {
          lensAnnotationIconFill: renderedInChart && iconConfig.canFill,
        }
      )}
    />
  );
};

interface MarkerConfig {
  axisMode?: YAxisMode;
  icon?: string;
  textVisibility?: boolean;
  iconPosition?: IconPosition;
}

export function Marker({
  config,
  isHorizontal,
  hasReducedPadding,
  label,
  rotateClassName,
}: {
  config: MarkerConfig;
  isHorizontal: boolean;
  hasReducedPadding: boolean;
  label?: string;
  rotateClassName?: string;
}) {
  if (hasIcon(config.icon)) {
    return (
      <AnnotationIcon type={config.icon} rotateClassName={rotateClassName} renderedInChart={true} />
    );
  }

  // if there's some text, check whether to show it as marker, or just show some padding for the icon
  if (config.textVisibility) {
    if (hasReducedPadding) {
      return <MarkerBody label={label} isHorizontal={isHorizontal} />;
    }
    return <EuiIcon type="empty" />;
  }
  return null;
}
