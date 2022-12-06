/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Dispatch, useCallback, useContext } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiIconProps } from '@elastic/eui';

import type { PaletteContinuity, CustomPaletteParams } from '../../../palettes';

import { isLastItem } from './utils';
import { TooltipWrapper } from '../tooltip_wrapper';

import type { ColorRangesActions, ColorRange, ColorRangeAccessor } from './types';
import { ColorRangesContext } from './color_ranges_context';

export interface ColorRangesItemButtonProps {
  index: number;
  colorRanges: ColorRange[];
  rangeType: CustomPaletteParams['rangeType'];
  continuity: PaletteContinuity;
  dispatch: Dispatch<ColorRangesActions>;
  accessor: ColorRangeAccessor;
  tooltipContent: string;
  iconFactory: (props: Omit<EuiIconProps, 'type'>) => JSX.Element;
}

const switchContinuity = (isLast: boolean, continuity: PaletteContinuity) => {
  switch (continuity) {
    case 'none':
      return isLast ? 'above' : 'below';
    case 'above':
      return isLast ? 'none' : 'all';
    case 'below':
      return isLast ? 'all' : 'none';
    case 'all':
      return isLast ? 'below' : 'above';
  }
};

export function ColorRangeDeleteButton({ index, dispatch }: ColorRangesItemButtonProps) {
  const { dataBounds, palettes } = useContext(ColorRangesContext);
  const onExecuteAction = useCallback(() => {
    dispatch({ type: 'deleteColorRange', payload: { index, dataBounds, palettes } });
  }, [dispatch, index, dataBounds, palettes]);

  const title = i18n.translate('coloring.dynamicColoring.customPalette.deleteButtonAriaLabel', {
    defaultMessage: 'Delete',
  });

  return (
    <EuiButtonIcon
      iconType="trash"
      color="danger"
      aria-label={title}
      title={title}
      onClick={onExecuteAction}
      data-test-subj={`lnsPalettePanel_dynamicColoring_removeColorRange_${index}`}
    />
  );
}

export function ColorRangeEditButton({
  index,
  continuity,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const { dataBounds, palettes, disableSwitchingContinuity } = useContext(ColorRangesContext);
  const isLast = isLastItem(accessor);

  const onExecuteAction = useCallback(() => {
    const newContinuity = switchContinuity(isLast, continuity);

    dispatch({
      type: 'updateContinuity',
      payload: { isLast, continuity: newContinuity, dataBounds, palettes },
    });
  }, [isLast, dispatch, continuity, dataBounds, palettes]);

  let tooltipContent = isLast
    ? i18n.translate('coloring.dynamicColoring.customPalette.setCustomMinValue', {
        defaultMessage: `Set custom maximum value`,
      })
    : i18n.translate('coloring.dynamicColoring.customPalette.setCustomMaxValue', {
        defaultMessage: `Set custom minimum value`,
      });

  if (disableSwitchingContinuity) {
    tooltipContent = i18n.translate(
      'coloring.dynamicColoring.customPalette.disallowedEditMinMaxValues',
      {
        defaultMessage: `You cannot set custom value for current configuration`,
      }
    );
  }

  return (
    <TooltipWrapper tooltipContent={tooltipContent} condition={true} position="top" delay="regular">
      <EuiButtonIcon
        iconType="pencil"
        aria-label={tooltipContent}
        disabled={disableSwitchingContinuity}
        onClick={onExecuteAction}
        data-test-subj={`lnsPalettePanel_dynamicColoring_editValue_${index}`}
      />
    </TooltipWrapper>
  );
}

export function ColorRangeAutoDetectButton({
  continuity,
  dispatch,
  accessor,
  tooltipContent,
  iconFactory,
}: ColorRangesItemButtonProps) {
  const { dataBounds, palettes } = useContext(ColorRangesContext);
  const isLast = isLastItem(accessor);

  const onExecuteAction = useCallback(() => {
    const newContinuity = switchContinuity(isLast, continuity);

    dispatch({
      type: 'updateContinuity',
      payload: { isLast, continuity: newContinuity, dataBounds, palettes },
    });
  }, [continuity, dataBounds, dispatch, isLast, palettes]);

  return (
    <TooltipWrapper tooltipContent={tooltipContent} condition={true} position="top" delay="regular">
      <EuiButtonIcon
        iconType={iconFactory}
        aria-label={tooltipContent}
        onClick={onExecuteAction}
        data-test-subj={`lnsPalettePanel_dynamicColoring_autoDetect_${
          isLast ? 'maximum' : 'minimum'
        }`}
      />
    </TooltipWrapper>
  );
}
