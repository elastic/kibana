/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { core } from '../kibana_services';
import type { PanelSettingsApi, PanelSettingsState } from './types';
import { apiSupportsPanelTimeRange } from './types';

export interface PanelSettingsAccordionsProps {
  api: PanelSettingsApi;
  state: PanelSettingsState;
  updateState: (update: Partial<PanelSettingsState>) => void;
  fallbackTimeRange?: TimeRange;
  /** Extra styles for each accordion section, e.g. to match the padding of the host flyout */
  sectionCss?: SerializedStyles;
  /** Panel type specific options, rendered at the end of the "Panel options" section */
  panelOptions?: React.ReactNode;
  /** Whether the sections are expanded when first rendered */
  initialIsOpen?: boolean;
}

const SettingsAccordion = ({
  id,
  title,
  sectionCss,
  initialIsOpen,
  children,
}: {
  id: string;
  title: string;
  sectionCss?: SerializedStyles;
  initialIsOpen?: boolean;
  children: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem
      grow={false}
      data-test-subj={`panelSettings-${id}`}
      css={[
        css`
          border-top: ${euiTheme.border.thin};
        `,
        sectionCss,
      ]}
    >
      <EuiAccordion
        id={id}
        buttonContent={
          <EuiTitle
            size="xxs"
            css={css`
              padding: 2px;
            `}
          >
            <h5>{title}</h5>
          </EuiTitle>
        }
        buttonProps={{ paddingSize: 'm' }}
        initialIsOpen={initialIsOpen}
      >
        {children}
        <EuiSpacer size="m" />
      </EuiAccordion>
    </EuiFlexItem>
  );
};

export const PanelSettingsAccordions = ({
  api,
  state,
  updateState,
  fallbackTimeRange,
  sectionCss,
  panelOptions,
  initialIsOpen,
}: PanelSettingsAccordionsProps) => {
  const { uiSettings } = core;
  const defaultTitle = api.defaultTitle$?.value;
  const defaultDescription = api.defaultDescription$?.value;

  const commonlyUsedRanges = useMemo(
    () =>
      (
        uiSettings.get<Array<{ from: string; to: string; display: string }>>(
          UI_SETTINGS.TIMEPICKER_QUICK_RANGES
        ) ?? []
      ).map(({ from, to, display }) => ({ start: from, end: to, label: display })),
    [uiSettings]
  );
  const dateFormat = useMemo(() => uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT), [uiSettings]);

  const timeRange = state.timeRange ?? fallbackTimeRange;

  return (
    <>
      <SettingsAccordion
        sectionCss={sectionCss}
        initialIsOpen={initialIsOpen}
        id="titleAndDescription"
        title={i18n.translate('embeddableApi.panelSettings.titleAndDescriptionLabel', {
          defaultMessage: 'Title and description',
        })}
      >
        <EuiFormRow fullWidth>
          <EuiSwitch
            checked={!state.hideTitle}
            data-test-subj="customEmbeddablePanelHideTitleSwitch"
            label={i18n.translate('embeddableApi.panelSettings.showTitleLabel', {
              defaultMessage: 'Show title',
            })}
            onChange={(e) => updateState({ hideTitle: !e.target.checked })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('embeddableApi.panelSettings.titleLabel', {
            defaultMessage: 'Title',
          })}
          labelAppend={
            defaultTitle && (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="resetCustomEmbeddablePanelTitleButton"
                onClick={() => updateState({ title: defaultTitle })}
                disabled={state.hideTitle || state.title === defaultTitle}
                aria-label={i18n.translate(
                  'embeddableApi.panelSettings.resetTitleButtonAriaLabel',
                  { defaultMessage: 'Reset title to default' }
                )}
              >
                {i18n.translate('embeddableApi.panelSettings.resetButtonLabel', {
                  defaultMessage: 'Reset to default',
                })}
              </EuiButtonEmpty>
            )
          }
        >
          <EuiFieldText
            fullWidth
            data-test-subj="customEmbeddablePanelTitleInput"
            disabled={state.hideTitle}
            value={state.title ?? ''}
            onChange={(e) => updateState({ title: e.target.value })}
            aria-label={i18n.translate('embeddableApi.panelSettings.titleInputAriaLabel', {
              defaultMessage: 'Enter a custom title for your panel',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('embeddableApi.panelSettings.descriptionLabel', {
            defaultMessage: 'Description',
          })}
          labelAppend={
            defaultDescription && (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="resetCustomEmbeddablePanelDescriptionButton"
                onClick={() => updateState({ description: defaultDescription })}
                disabled={state.description === defaultDescription}
                aria-label={i18n.translate(
                  'embeddableApi.panelSettings.resetDescriptionButtonAriaLabel',
                  { defaultMessage: 'Reset description to default' }
                )}
              >
                {i18n.translate('embeddableApi.panelSettings.resetButtonLabel', {
                  defaultMessage: 'Reset to default',
                })}
              </EuiButtonEmpty>
            )
          }
        >
          <EuiTextArea
            fullWidth
            data-test-subj="customEmbeddablePanelDescriptionInput"
            value={state.description ?? ''}
            onChange={(e) => updateState({ description: e.target.value })}
            aria-label={i18n.translate('embeddableApi.panelSettings.descriptionInputAriaLabel', {
              defaultMessage: 'Enter a custom description for your panel',
            })}
          />
        </EuiFormRow>
      </SettingsAccordion>
      <SettingsAccordion
        sectionCss={sectionCss}
        initialIsOpen={initialIsOpen}
        id="panelOptions"
        title={i18n.translate('embeddableApi.panelSettings.panelOptionsLabel', {
          defaultMessage: 'Panel options',
        })}
      >
        <EuiFormRow fullWidth>
          <EuiSwitch
            checked={!state.hideBorder}
            data-test-subj="customizePanelBorderlessToggle"
            label={i18n.translate('embeddableApi.panelSettings.showBorderLabel', {
              defaultMessage: 'Show panel border',
            })}
            onChange={(e) => updateState({ hideBorder: !e.target.checked })}
          />
        </EuiFormRow>
        {panelOptions}
        {apiSupportsPanelTimeRange(api) ? (
          <EuiFormRow fullWidth>
            <EuiSwitch
              checked={state.hasOwnTimeRange}
              data-test-subj="customizePanelShowCustomTimeRange"
              label={i18n.translate('embeddableApi.panelSettings.customTimeRangeLabel', {
                defaultMessage: 'Apply custom time range',
              })}
              onChange={(e) => updateState({ hasOwnTimeRange: e.target.checked })}
            />
          </EuiFormRow>
        ) : null}
        {apiSupportsPanelTimeRange(api) && state.hasOwnTimeRange ? (
          <EuiFormRow
            fullWidth
            label={i18n.translate('embeddableApi.panelSettings.timeRangeLabel', {
              defaultMessage: 'Time range',
            })}
          >
            <EuiSuperDatePicker
              width="full"
              start={timeRange?.from}
              end={timeRange?.to}
              onTimeChange={({ start, end }) =>
                updateState({ timeRange: { from: start, to: end } })
              }
              showUpdateButton={false}
              dateFormat={dateFormat}
              commonlyUsedRanges={commonlyUsedRanges}
              data-test-subj="customizePanelTimeRangeDatePicker"
            />
          </EuiFormRow>
        ) : null}
      </SettingsAccordion>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default PanelSettingsAccordions;
