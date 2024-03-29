/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { UI_SETTINGS } from '@kbn/data-plugin/public';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  getInheritedViewMode,
  getPanelTitle,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';

import { core } from '../../kibana_services';
import { CustomizePanelActionApi } from './customize_panel_action';
import { FiltersDetails } from './filters_details';

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

export const CustomizePanelEditor = ({
  api,
  onClose,
  focusOnTitle,
}: {
  onClose: () => void;
  focusOnTitle?: boolean;
  api: CustomizePanelActionApi;
}) => {
  /**
   * eventually the panel editor could be made to use state from the API instead (which will allow us to use a push flyout)
   * For now, we copy the state here with `useState` initializing it to the latest value.
   */
  const editMode = getInheritedViewMode(api) === 'edit';
  const [hideTitle, setHideTitle] = useState(api.hidePanelTitle?.value);
  const [panelDescription, setPanelDescription] = useState(
    api.panelDescription?.value ?? api.defaultPanelDescription?.value
  );
  const [panelTitle, setPanelTitle] = useState(getPanelTitle(api));
  const [timeRange, setTimeRange] = useState(
    api.timeRange$?.value ?? api.parentApi?.timeRange$?.value
  );

  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusOnTitle && initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
  }, [initialFocusRef, focusOnTitle]);

  const [hasOwnTimeRange, setHasOwnTimeRange] = useState<boolean>(Boolean(api.timeRange$?.value));

  const commonlyUsedRangesForDatePicker = useMemo(() => {
    const commonlyUsedRanges = core.uiSettings.get<TimePickerQuickRange[]>(
      UI_SETTINGS.TIMEPICKER_QUICK_RANGES
    );
    if (!commonlyUsedRanges) return [];
    return commonlyUsedRanges.map(
      ({ from, to, display }: { from: string; to: string; display: string }) => {
        return {
          start: from,
          end: to,
          label: display,
        };
      }
    );
  }, []);

  const dateFormat = useMemo(() => core.uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT), []);

  const save = () => {
    if (panelTitle !== api.panelTitle?.value) api.setPanelTitle?.(panelTitle);
    if (hideTitle !== api.hidePanelTitle?.value) api.setHidePanelTitle?.(hideTitle);
    if (panelDescription !== api.panelDescription?.value)
      api.setPanelDescription?.(panelDescription);

    const newTimeRange = hasOwnTimeRange ? timeRange : undefined;
    if (newTimeRange !== api.timeRange$?.value) {
      api.setTimeRange?.(newTimeRange);
    }

    onClose();
  };

  const renderCustomTitleComponent = () => {
    if (!editMode) return null;

    return (
      <div data-test-subj="customEmbeddableTitleComponent">
        <EuiFormRow>
          <EuiSwitch
            checked={!hideTitle}
            data-test-subj="customEmbeddablePanelHideTitleSwitch"
            disabled={!editMode}
            id="hideTitle"
            label={
              <FormattedMessage
                defaultMessage="Show title"
                id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.showTitle"
              />
            }
            onChange={(e) => setHideTitle(!e.target.checked)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.panelTitleFormRowLabel"
              defaultMessage="Title"
            />
          }
          labelAppend={
            <EuiButtonEmpty
              size="xs"
              data-test-subj="resetCustomEmbeddablePanelTitleButton"
              onClick={() => setPanelTitle(api.defaultPanelTitle?.value)}
              disabled={hideTitle || !editMode || api?.defaultPanelTitle?.value === panelTitle}
              aria-label={i18n.translate(
                'presentationPanel.action.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonAriaLabel',
                {
                  defaultMessage: 'Reset title',
                }
              )}
            >
              <FormattedMessage
                id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonLabel"
                defaultMessage="Reset"
              />
            </EuiButtonEmpty>
          }
        >
          <EuiFieldText
            inputRef={initialFocusRef}
            id="panelTitleInput"
            className="panelTitleInputText"
            data-test-subj="customEmbeddablePanelTitleInput"
            name="title"
            type="text"
            disabled={hideTitle || !editMode}
            value={panelTitle ?? ''}
            onChange={(e) => setPanelTitle(e.target.value)}
            aria-label={i18n.translate(
              'presentationPanel.action.customizePanel.flyout.optionsMenuForm.panelTitleInputAriaLabel',
              {
                defaultMessage: 'Enter a custom title for your panel',
              }
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.panelDescriptionFormRowLabel"
              defaultMessage="Description"
            />
          }
          labelAppend={
            <EuiButtonEmpty
              size="xs"
              data-test-subj="resetCustomEmbeddablePanelDescriptionButton"
              onClick={() => setPanelDescription(api.defaultPanelDescription?.value)}
              disabled={!editMode || api.defaultPanelDescription?.value === panelDescription}
              aria-label={i18n.translate(
                'presentationPanel.action.customizePanel.flyout.optionsMenuForm.resetCustomDescriptionButtonAriaLabel',
                {
                  defaultMessage: 'Reset description',
                }
              )}
            >
              <FormattedMessage
                id="presentationPanel.action.customizePanel.modal.optionsMenuForm.resetCustomDescriptionButtonLabel"
                defaultMessage="Reset"
              />
            </EuiButtonEmpty>
          }
        >
          <EuiTextArea
            id="panelDescriptionInput"
            className="panelDescriptionInputText"
            data-test-subj="customEmbeddablePanelDescriptionInput"
            disabled={!editMode}
            name="description"
            value={panelDescription ?? ''}
            onChange={(e) => setPanelDescription(e.target.value)}
            aria-label={i18n.translate(
              'presentationPanel.action.customizePanel.flyout.optionsMenuForm.panelDescriptionAriaLabel',
              {
                defaultMessage: 'Enter a custom description for your panel',
              }
            )}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </div>
    );
  };

  const renderCustomTimeRangeComponent = () => {
    if (
      !apiPublishesTimeRange(api) ||
      !((api as PublishesUnifiedSearch).isCompatibleWithUnifiedSearch?.() ?? true)
    )
      return null;

    return (
      <>
        <EuiFormRow>
          <EuiSwitch
            checked={hasOwnTimeRange}
            data-test-subj="customizePanelShowCustomTimeRange"
            id="showCustomTimeRange"
            label={
              <FormattedMessage
                defaultMessage="Apply custom time range"
                id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.showCustomTimeRangeSwitch"
              />
            }
            onChange={(e) => setHasOwnTimeRange(e.target.checked)}
          />
        </EuiFormRow>
        {hasOwnTimeRange ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.panelTimeRangeFormRowLabel"
                defaultMessage="Time range"
              />
            }
          >
            <EuiSuperDatePicker
              start={timeRange?.from ?? undefined}
              end={timeRange?.to ?? undefined}
              onTimeChange={({ start, end }) => setTimeRange({ from: start, to: end })}
              showUpdateButton={false}
              dateFormat={dateFormat}
              commonlyUsedRanges={commonlyUsedRangesForDatePicker}
              data-test-subj="customizePanelTimeRangeDatePicker"
            />
          </EuiFormRow>
        ) : null}
      </>
    );
  };

  const renderFilterDetails = () => {
    if (!apiPublishesUnifiedSearch(api)) return null;

    return (
      <>
        <EuiSpacer size="m" />
        <FiltersDetails editMode={editMode} api={api} />
      </>
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="presentationPanel.action.customizePanel.flyout.title"
              defaultMessage="Panel settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm data-test-subj="customizePanelForm">
          {renderCustomTitleComponent()}
          {renderCustomTimeRangeComponent()}
          {renderFilterDetails()}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="cancelCustomizePanelButton" onClick={onClose}>
              <FormattedMessage
                id="presentationPanel.action.customizePanel.flyout.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="saveCustomizePanelButton" onClick={save} fill>
              <FormattedMessage
                id="presentationPanel.action.customizePanel.flyout.saveButtonTitle"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
