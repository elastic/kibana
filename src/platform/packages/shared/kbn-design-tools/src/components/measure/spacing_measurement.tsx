/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import { useEuiSizeLookup } from '../../hooks';
import type { SpacingLine } from '../../lib/dom/calculate_spacing';
import { ENDPOINT_SIZE } from '../../lib/constants';

interface Props {
  lines: SpacingLine[];
}

/**
 * SpacingMeasurement renders measurement lines between two elements,
 * showing pixel distances with indicator lines.
 */
export const SpacingMeasurement = ({ lines }: Props) => {
  const { euiTheme } = useEuiTheme();
  const sizeLookup = useEuiSizeLookup();

  if (lines.length === 0) return null;

  return (
    <>
      {lines.map((line, index) => {
        if (line.distance === 0) return null;

        const euiSizeKey = sizeLookup.get(line.distance);
        const measureColor = euiSizeKey ? euiTheme.colors.success : euiTheme.colors.danger;
        const isHorizontal = line.orientation === 'horizontal';
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;

        const lineCss = css({
          label: `line-${index}`,
          position: 'fixed',
          backgroundColor: measureColor,
          pointerEvents: 'none',
          zIndex: 1,
          ...(isHorizontal
            ? {
                left: `${Math.min(line.x1, line.x2)}px`,
                top: `${line.y1}px`,
                width: `${Math.abs(line.x2 - line.x1)}px`,
                height: '1px',
              }
            : {
                left: `${line.x1}px`,
                top: `${Math.min(line.y1, line.y2)}px`,
                width: '1px',
                height: `${Math.abs(line.y2 - line.y1)}px`,
              }),
        });

        const startCapCss = css({
          label: `startCap-${index}`,
          position: 'fixed',
          backgroundColor: measureColor,
          pointerEvents: 'none',
          zIndex: 1,
          ...(isHorizontal
            ? {
                left: `${line.x1}px`,
                top: `${line.y1 - ENDPOINT_SIZE}px`,
                width: '1px',
                height: `${ENDPOINT_SIZE * 2 + 1}px`,
              }
            : {
                left: `${line.x1 - ENDPOINT_SIZE}px`,
                top: `${line.y1}px`,
                width: `${ENDPOINT_SIZE * 2 + 1}px`,
                height: '1px',
              }),
        });

        const endCapCss = css({
          label: `endCap-${index}`,
          position: 'fixed',
          backgroundColor: measureColor,
          pointerEvents: 'none',
          zIndex: 1,
          ...(isHorizontal
            ? {
                left: `${line.x2}px`,
                top: `${line.y2 - ENDPOINT_SIZE}px`,
                width: '1px',
                height: `${ENDPOINT_SIZE * 2 + 1}px`,
              }
            : {
                left: `${line.x2 - ENDPOINT_SIZE}px`,
                top: `${line.y2}px`,
                width: `${ENDPOINT_SIZE * 2 + 1}px`,
                height: '1px',
              }),
        });

        const labelCss = css({
          label: `label-${index}`,
          position: 'fixed',
          left: `${midX}px`,
          top: `${midY}px`,
          transform: isHorizontal
            ? 'translate(-50%, -100%) translateY(-4px)'
            : 'translate(6px, -50%)',
          backgroundColor: measureColor,
          color: '#fff',
          fontFamily: euiTheme.font.familyCode,
          fontSize: '11px',
          fontWeight: euiTheme.font.weight.bold,
          lineHeight: 1,
          padding: '2px 5px',
          borderRadius: '3px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 2,
        });

        return (
          <Fragment key={index}>
            <div className={lineCss} data-test-subj="spacingMeasurementLine" />
            <div className={startCapCss} data-test-subj="spacingMeasurementStartCap" />
            <div className={endCapCss} data-test-subj="spacingMeasurementEndCap" />
            <div className={labelCss} data-test-subj="spacingMeasurementLabel">
              {euiSizeKey ? `${line.distance}px (${euiSizeKey})` : `${line.distance}px`}
            </div>
          </Fragment>
        );
      })}
    </>
  );
};
