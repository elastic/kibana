/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React, { useReducer, useMemo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { css } from '@emotion/react';
import { EuiFormRow, htmlIdGenerator, EuiButtonGroup, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { PalettePicker } from './palette_picker';
import {
  PaletteOutput,
  PaletteRegistry,
  DataBounds,
  getFallbackDataBounds,
  CustomPaletteParams,
  RequiredPaletteParamTypes,
} from '../../palettes';

import { toColorRanges } from './utils';
import { ColorRanges, ColorRangesContext } from './color_ranges';
import { isAllColorRangesValid } from './color_ranges/color_ranges_validation';
import { paletteConfigurationReducer } from './palette_configuration_reducer';

export interface CustomizablePaletteProps {
  palettes: PaletteRegistry;
  activePalette: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  dataBounds?: DataBounds;
  showRangeTypeSelector?: boolean;
  disableSwitchingContinuity?: boolean;
  showExtraActions?: boolean;
}

export const CustomizablePalette = ({
  palettes,
  activePalette,
  setPalette,
  dataBounds = getFallbackDataBounds(activePalette.params?.rangeType),
  showExtraActions = true,
  showRangeTypeSelector = true,
  disableSwitchingContinuity = false,
}: CustomizablePaletteProps) => {
  const idPrefix = useMemo(() => htmlIdGenerator()(), []);
  const colorRangesToShow = toColorRanges(
    palettes,
    activePalette.params?.colorStops || [],
    activePalette,
    dataBounds
  );

  const [localState, dispatch] = useReducer(paletteConfigurationReducer, {
    activePalette,
    colorRanges: colorRangesToShow,
  });

  useDebounce(
    () => {
      if (
        (localState.activePalette !== activePalette ||
          colorRangesToShow !== localState.colorRanges) &&
        isAllColorRangesValid(localState.colorRanges)
      ) {
        setPalette(localState.activePalette);
      }
    },
    250,
    [localState]
  );

  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => css`
      padding: ${euiTheme.size.base};
      background-color: ${euiTheme.colors.lightestShade};
      border-bottom: ${euiTheme.border.thin};
    `,
    [euiTheme.size.base, euiTheme.colors.lightestShade, euiTheme.border.thin]
  );

  return (
    <div css={styles} className="lnsPalettePanel__section">
      <EuiFormRow
        display="rowCompressed"
        label={i18n.translate('coloring.dynamicColoring.palettePicker.label', {
          defaultMessage: 'Color palette',
        })}
        fullWidth
      >
        <PalettePicker
          data-test-subj="lnsPalettePanel_dynamicColoring_palette_picker"
          palettes={palettes}
          activePalette={localState.activePalette}
          setPalette={(newPalette) => {
            const isPaletteChanged = newPalette.name !== activePalette.name;
            if (isPaletteChanged) {
              dispatch({
                type: 'changeColorPalette',
                payload: { palette: newPalette, dataBounds, palettes, disableSwitchingContinuity },
              });
            }
          }}
          showCustomPalette
          showDynamicColorOnly
        />
      </EuiFormRow>
      {showRangeTypeSelector && (
        <EuiFormRow
          label={
            <>
              {i18n.translate('coloring.dynamicColoring.rangeType.label', {
                defaultMessage: 'Value type',
              })}{' '}
              <EuiIconTip
                content={i18n.translate(
                  'coloring.dynamicColoring.customPalette.colorStopsHelpPercentage',
                  {
                    defaultMessage:
                      'Percent value types are relative to the full range of available data values.',
                  }
                )}
                position="top"
                size="s"
              />
            </>
          }
          display="rowCompressed"
        >
          <EuiButtonGroup
            legend={i18n.translate('coloring.dynamicColoring.rangeType.label', {
              defaultMessage: 'Value type',
            })}
            data-test-subj="lnsPalettePanel_dynamicColoring_custom_range_groups"
            name="dynamicColoringRangeType"
            buttonSize="compressed"
            options={[
              {
                id: `${idPrefix}percent`,
                label: i18n.translate('coloring.dynamicColoring.rangeType.percent', {
                  defaultMessage: 'Percent',
                }),
                'data-test-subj': 'lnsPalettePanel_dynamicColoring_rangeType_groups_percent',
              },
              {
                id: `${idPrefix}number`,
                label: i18n.translate('coloring.dynamicColoring.rangeType.number', {
                  defaultMessage: 'Number',
                }),
                'data-test-subj': 'lnsPalettePanel_dynamicColoring_rangeType_groups_number',
              },
            ]}
            idSelected={
              localState.activePalette.params?.rangeType
                ? `${idPrefix}${localState.activePalette.params?.rangeType}`
                : `${idPrefix}percent`
            }
            onChange={(id) => {
              const newRangeType = id.replace(
                idPrefix,
                ''
              ) as RequiredPaletteParamTypes['rangeType'];

              dispatch({
                type: 'updateRangeType',
                payload: { rangeType: newRangeType, dataBounds, palettes },
              });
            }}
            isFullWidth
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('coloring.dynamicColoring.palettePicker.colorRangesLabel', {
          defaultMessage: 'Color Ranges',
        })}
        display="rowCompressed"
        fullWidth
      >
        <ColorRangesContext.Provider
          value={{
            dataBounds,
            palettes,
            disableSwitchingContinuity,
          }}
        >
          <ColorRanges
            showExtraActions={showExtraActions}
            paletteConfiguration={localState.activePalette?.params}
            colorRanges={localState.colorRanges}
            dispatch={dispatch}
          />
        </ColorRangesContext.Provider>
      </EuiFormRow>
    </div>
  );
};
