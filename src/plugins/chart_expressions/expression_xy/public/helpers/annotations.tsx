/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { Position } from '@elastic/charts';
import { EuiFlexGroup, EuiIcon, EuiIconProps, EuiText } from '@elastic/eui';
import classnames from 'classnames';
import type {
  IconPosition,
  YAxisMode,
  ExtendedYConfig,
  CollectiveConfig,
} from '../../common/types';
import { getBaseIconPlacement } from '../components';
import { hasIcon, iconSet } from './icon';

export const LINES_MARKER_SIZE = 20;

type PartialExtendedYConfig = Pick<
  ExtendedYConfig,
  'axisMode' | 'icon' | 'iconPosition' | 'textVisibility'
>;

type PartialCollectiveConfig = Pick<CollectiveConfig, 'axisMode' | 'icon' | 'textVisibility'>;

const isExtendedYConfig = (
  config: PartialExtendedYConfig | PartialCollectiveConfig | undefined
): config is PartialExtendedYConfig =>
  (config as PartialExtendedYConfig)?.iconPosition ? true : false;

// Note: it does not take into consideration whether the reference line is in view or not
export const getLinesCausedPaddings = (
  visualConfigs: Array<PartialExtendedYConfig | PartialCollectiveConfig | undefined>,
  axesMap: Record<'left' | 'right', unknown>
) => {
  // collect all paddings for the 4 axis: if any text is detected double it.
  const paddings: Partial<Record<Position, number>> = {};
  const icons: Partial<Record<Position, number>> = {};
  visualConfigs?.forEach((config) => {
    if (!config) {
      return;
    }
    const { axisMode, icon, textVisibility } = config;
    const iconPosition = isExtendedYConfig(config) ? config.iconPosition : undefined;

    if (axisMode && (hasIcon(icon) || textVisibility)) {
      const placement = getBaseIconPlacement(iconPosition, axesMap, axisMode);
      paddings[placement] = Math.max(
        paddings[placement] || 0,
        LINES_MARKER_SIZE * (textVisibility ? 2 : 1) // double the padding size if there's text
      );
      icons[placement] = (icons[placement] || 0) + (hasIcon(icon) ? 1 : 0);
    }
  });
  // post-process the padding based on the icon presence:
  // if no icon is present for the placement, just reduce the padding
  (Object.keys(paddings) as Position[]).forEach((placement) => {
    if (!icons[placement]) {
      paddings[placement] = LINES_MARKER_SIZE;
    }
  });

  return paddings;
};

export function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
    case Position.Left:
      return Position.Bottom;
    case Position.Right:
      return Position.Top;
  }
}

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
      <div
        className="eui-textTruncate"
        style={{ maxWidth: LINES_MARKER_SIZE * 3 }}
        data-test-subj="xyVisAnnotationText"
      >
        {label}
      </div>
    );
  }
  return (
    <div
      className="xyDecorationRotatedWrapper"
      data-test-subj="xyVisAnnotationText"
      style={{
        width: LINES_MARKER_SIZE,
      }}
    >
      <div
        className="eui-textTruncate xyDecorationRotatedWrapper__label"
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
      className="xyAnnotationNumberIcon"
      data-test-subj="xyVisGroupedAnnotationIcon"
      gutterSize="none"
      alignItems="center"
    >
      <EuiText color="ghost" className="xyAnnotationNumberIcon__text">
        {number < 10 ? number : `9+`}
      </EuiText>
    </EuiFlexGroup>
  );
}

const isNumericalString = (value: string) => !isNaN(Number(value));

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
  const iconConfig = iconSet.find((i) => i.value === type);
  if (!iconConfig) {
    return null;
  }
  return (
    <EuiIcon
      {...rest}
      data-test-subj="xyVisAnnotationIcon"
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
