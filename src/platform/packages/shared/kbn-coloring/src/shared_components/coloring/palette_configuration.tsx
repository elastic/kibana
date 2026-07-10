/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import isEqual from 'lodash/isEqual';
import { css } from '@emotion/react';
import { EuiFormRow, htmlIdGenerator, EuiButtonGroup, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { PalettePicker } from './palette_picker';
import type {
  PaletteOutput,
  PaletteRegistry,
  DataBounds,
  CustomPaletteParams,
  RequiredPaletteParamTypes,
} from '../../palettes';
import { getFallbackDataBounds } from '../../palettes';

import { changeColorPalette, toColorRanges } from './utils';
import { ColorRanges, ColorRangesContext } from './color_ranges';
import { allRangesValid } from './color_ranges/color_ranges_validation';
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

function shouldSyncPaletteState(
  localState: {
    activePalette: PaletteOutput<CustomPaletteParams>;
    colorRanges: ReturnType<typeof toColorRanges>;
  },
  activePalette: PaletteOutput<CustomPaletteParams>,
  colorRangesToShow: ReturnType<typeof toColorRanges>
) {
  return (
    (!isEqual(localState.activePalette, activePalette) ||
      !isEqual(colorRangesToShow, localState.colorRanges)) &&
    allRangesValid(localState.colorRanges, localState.activePalette.params?.rangeType === 'percent')
  );
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
  const colorRangesToShow = useMemo(() => {
    return toColorRanges(
      palettes,
      activePalette.params?.colorStops || [],
      activePalette,
      dataBounds
    );
  }, [palettes, activePalette, dataBounds]);

  const [localState, dispatch] = useReducer(paletteConfigurationReducer, {
    activePalette,
    colorRanges: colorRangesToShow,
  });
  // Preserve the latest callback without rearming the unmount cleanup on each render.
  const setPaletteRef = useRef(setPalette);
  const pendingPalette = useMemo(
    () =>
      shouldSyncPaletteState(localState, activePalette, colorRangesToShow)
        ? localState.activePalette
        : undefined,
    [activePalette, colorRangesToShow, localState]
  );
  const pendingPaletteRef = useRef<PaletteOutput<CustomPaletteParams> | undefined>(pendingPalette);

  useEffect(() => {
    setPaletteRef.current = setPalette;
  }, [setPalette]);

  useEffect(() => {
    pendingPaletteRef.current = pendingPalette;
  }, [pendingPalette]);

  useDebounce(
    () => {
      if (pendingPalette) {
        pendingPaletteRef.current = undefined;
        setPaletteRef.current(pendingPalette);
      }
    },
    250,
    [pendingPalette]
  );

  useEffect(() => {
    return () => {
      // Closing the flyout should not drop local palette edits that have not debounced yet.
      if (pendingPaletteRef.current) {
        setPaletteRef.current(pendingPaletteRef.current);
      }
    };
  }, []);

  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => css`
      padding: ${euiTheme.size.base};
    `,
    [euiTheme.size.base]
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
            const isPaletteChanged = newPalette.name !== localState.activePalette.name;
            if (isPaletteChanged) {
              const resolvedPalette = changeColorPalette(
                newPalette,
                localState.activePalette,
                palettes,
                dataBounds,
                disableSwitchingContinuity
              );
              dispatch({
                type: 'changeColorPalette',
                payload: { palette: newPalette, dataBounds, palettes, disableSwitchingContinuity },
              });
              setPalette(resolvedPalette);
            }
          }}
          showCustomPalette
          showDynamicColorOnly
        />
      </EuiFormRow>
      {showRangeTypeSelector && (
        <EuiFormRow
          fullWidth
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
            isFullWidth
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
