/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, Dispatch, useContext } from 'react';
import { EuiFlexGroup, EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';

import { DistributeEquallyIcon } from '../assets/distribute_equally';
import { TooltipWrapper } from '../tooltip_wrapper';

import type { ColorRangesActions } from './types';
import { ColorRangesContext } from './color_ranges_context';

export interface ColorRangesExtraActionsProps {
  dispatch: Dispatch<ColorRangesActions>;
  shouldDisableAdd?: boolean;
  shouldDisableReverse?: boolean;
  shouldDisableDistribute?: boolean;
}

export function ColorRangesExtraActions({
  dispatch,
  shouldDisableAdd = false,
  shouldDisableReverse = false,
  shouldDisableDistribute = false,
}: ColorRangesExtraActionsProps) {
  const { dataBounds, palettes } = useContext(ColorRangesContext);
  const onAddColorRange = useCallback(() => {
    dispatch({
      type: 'addColorRange',
      payload: { dataBounds, palettes },
    });
  }, [dataBounds, dispatch, palettes]);

  const onReversePalette = useCallback(() => {
    dispatch({ type: 'reversePalette', payload: { dataBounds, palettes } });
  }, [dispatch, dataBounds, palettes]);

  const onDistributeValues = useCallback(() => {
    dispatch({ type: 'distributeEqually', payload: { dataBounds, palettes } });
  }, [dataBounds, dispatch, palettes]);

  const oneColorRangeWarn = i18n.translate('coloring.dynamicColoring.customPalette.oneColorRange', {
    defaultMessage: `Requires more than one color`,
  });

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="none" wrap={true}>
      <EuiFlexItem grow={false}>
        <TooltipWrapper
          tooltipContent={i18n.translate(
            'coloring.dynamicColoring.customPalette.maximumStepsApplied',
            {
              defaultMessage: `You've applied the maximum number of steps`,
            }
          )}
          condition={shouldDisableAdd}
          position="top"
          delay="regular"
        >
          <EuiButtonEmpty
            data-test-subj={`lnsPalettePanel_dynamicColoring_addColor`}
            iconType="plusInCircle"
            color="primary"
            aria-label={i18n.translate('coloring.dynamicColoring.customPalette.addColorAriaLabel', {
              defaultMessage: 'Add color',
            })}
            size="xs"
            flush="left"
            disabled={shouldDisableAdd}
            onClick={onAddColorRange}
          >
            <FormattedMessage
              id="coloring.dynamicColoring.customPalette.addColor"
              defaultMessage="Add color"
            />
          </EuiButtonEmpty>
        </TooltipWrapper>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TooltipWrapper
          tooltipContent={oneColorRangeWarn}
          condition={shouldDisableReverse}
          position="top"
          delay="regular"
        >
          <EuiButtonEmpty
            data-test-subj={`lnsPalettePanel_dynamicColoring_reverseColors`}
            iconType="sortable"
            color="primary"
            aria-label={i18n.translate('coloring.dynamicColoring.customPaletteAriaLabel', {
              defaultMessage: 'Reverse colors',
            })}
            size="xs"
            flush="left"
            onClick={onReversePalette}
            disabled={shouldDisableReverse}
          >
            <FormattedMessage
              id="coloring.dynamicColoring.customPalette.reverseColors"
              defaultMessage="Reverse colors"
            />
          </EuiButtonEmpty>
        </TooltipWrapper>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TooltipWrapper
          tooltipContent={oneColorRangeWarn}
          condition={shouldDisableDistribute}
          position="top"
          delay="regular"
        >
          <EuiButtonEmpty
            data-test-subj={`lnsPalettePanel_dynamicColoring_distributeValues`}
            iconType={DistributeEquallyIcon}
            color="primary"
            aria-label={i18n.translate(
              'coloring.dynamicColoring.customPalette.distributeValuesAriaLabel',
              {
                defaultMessage: 'Distribute values',
              }
            )}
            size="xs"
            flush="left"
            disabled={shouldDisableDistribute}
            onClick={onDistributeValues}
          >
            <FormattedMessage
              id="coloring.dynamicColoring.customPalette.distributeValues"
              defaultMessage="Distribute values"
            />
          </EuiButtonEmpty>
        </TooltipWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
