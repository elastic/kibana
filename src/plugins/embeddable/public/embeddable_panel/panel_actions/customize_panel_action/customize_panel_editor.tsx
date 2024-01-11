/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';

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
import { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  CommonlyUsedRange,
  Embeddable,
  IEmbeddable,
  isFilterableEmbeddable,
  ViewMode,
} from '../../../lib';
import { canInheritTimeRange } from './can_inherit_time_range';
import { doesInheritTimeRange } from './does_inherit_time_range';
import { FiltersDetails } from './filters_details';
import { TimeRangeInput } from './time_range_helpers';

type PanelSettings = {
  title?: string;
  hidePanelTitles?: boolean;
  description?: string;
  timeRange?: TimeRange;
};

interface CustomizePanelProps {
  embeddable: IEmbeddable;
  timeRangeCompatible: boolean;
  dateFormat?: string;
  commonlyUsedRanges?: CommonlyUsedRange[];
  onClose: () => void;
  onEdit: () => void;
  focusOnTitle?: boolean;
}

export const CustomizePanelEditor = (props: CustomizePanelProps) => {
  const { onClose, embeddable, dateFormat, timeRangeCompatible, onEdit, focusOnTitle } = props;
  const editMode = embeddable.getInput().viewMode === ViewMode.EDIT;
  const [hideTitle, setHideTitle] = useState(embeddable.getInput().hidePanelTitles);
  const [panelDescription, setPanelDescription] = useState(
    embeddable.getInput().description ?? embeddable.getOutput().defaultDescription
  );
  const [panelTitle, setPanelTitle] = useState(
    embeddable.getInput().title ?? embeddable.getOutput().defaultTitle
  );
  const [inheritTimeRange, setInheritTimeRange] = useState(
    timeRangeCompatible ? doesInheritTimeRange(embeddable as Embeddable<TimeRangeInput>) : false
  );
  const [panelTimeRange, setPanelTimeRange] = useState(
    timeRangeCompatible
      ? (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange
      : undefined
  );
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusOnTitle && initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
  }, [initialFocusRef, focusOnTitle]);

  const commonlyUsedRangesForDatePicker = props.commonlyUsedRanges
    ? props.commonlyUsedRanges.map(
        ({ from, to, display }: { from: string; to: string; display: string }) => {
          return {
            start: from,
            end: to,
            label: display,
          };
        }
      )
    : undefined;

  const save = () => {
    const newPanelSettings: PanelSettings = {
      hidePanelTitles: hideTitle,
      title: panelTitle === embeddable.getOutput().defaultTitle ? undefined : panelTitle,
      description:
        panelDescription === embeddable.getOutput().defaultDescription
          ? undefined
          : panelDescription,
    };
    if (Boolean(timeRangeCompatible))
      newPanelSettings.timeRange = !inheritTimeRange ? panelTimeRange : undefined;

    embeddable.updateInput(newPanelSettings);
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
                id="embeddableApi.customizePanel.flyout.optionsMenuForm.showTitle"
              />
            }
            onChange={(e) => setHideTitle(!e.target.checked)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="embeddableApi.customizePanel.flyout.optionsMenuForm.panelTitleFormRowLabel"
              defaultMessage="Title"
            />
          }
          labelAppend={
            <EuiButtonEmpty
              size="xs"
              data-test-subj="resetCustomEmbeddablePanelTitleButton"
              onClick={() => setPanelTitle(embeddable.getOutput().defaultTitle)}
              disabled={
                hideTitle || !editMode || embeddable.getOutput().defaultTitle === panelTitle
              }
              aria-label={i18n.translate(
                'embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonAriaLabel',
                {
                  defaultMessage: 'Reset title',
                }
              )}
            >
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonLabel"
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
              'embeddableApi.customizePanel.flyout.optionsMenuForm.panelTitleInputAriaLabel',
              {
                defaultMessage: 'Enter a custom title for your panel',
              }
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="embeddableApi.customizePanel.flyout.optionsMenuForm.panelDescriptionFormRowLabel"
              defaultMessage="Description"
            />
          }
          labelAppend={
            <EuiButtonEmpty
              size="xs"
              data-test-subj="resetCustomEmbeddablePanelDescriptionButton"
              onClick={() => {
                setPanelDescription(embeddable.getOutput().defaultDescription);
              }}
              disabled={
                hideTitle ||
                !editMode ||
                embeddable.getOutput().defaultDescription === panelDescription
              }
              aria-label={i18n.translate(
                'embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomDescriptionButtonAriaLabel',
                {
                  defaultMessage: 'Reset description',
                }
              )}
            >
              <FormattedMessage
                id="embeddableApi.customizePanel.modal.optionsMenuForm.resetCustomDescriptionButtonLabel"
                defaultMessage="Reset"
              />
            </EuiButtonEmpty>
          }
        >
          <EuiTextArea
            id="panelDescriptionInput"
            className="panelDescriptionInputText"
            data-test-subj="customEmbeddablePanelDescriptionInput"
            disabled={hideTitle || !editMode}
            name="description"
            value={panelDescription ?? ''}
            onChange={(e) => setPanelDescription(e.target.value)}
            aria-label={i18n.translate(
              'embeddableApi.customizePanel.flyout.optionsMenuForm.panelDescriptionAriaLabel',
              {
                defaultMessage: 'Enter a custom description for your panel',
              }
            )}
          />
        </EuiFormRow>
      </div>
    );
  };

  const renderCustomTimeRangeComponent = () => {
    if (!timeRangeCompatible) return null;

    return (
      <>
        {canInheritTimeRange(embeddable as Embeddable<TimeRangeInput>) ? (
          <EuiFormRow>
            <EuiSwitch
              checked={!inheritTimeRange}
              data-test-subj="customizePanelShowCustomTimeRange"
              id="showCustomTimeRange"
              label={
                <FormattedMessage
                  defaultMessage="Apply custom time range"
                  id="embeddableApi.customizePanel.flyout.optionsMenuForm.showCustomTimeRangeSwitch"
                />
              }
              onChange={(e) => setInheritTimeRange(!e.target.checked)}
            />
          </EuiFormRow>
        ) : null}
        {!inheritTimeRange ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.optionsMenuForm.panelTimeRangeFormRowLabel"
                defaultMessage="Time range"
              />
            }
          >
            <EuiSuperDatePicker
              start={panelTimeRange?.from ?? undefined}
              end={panelTimeRange?.to ?? undefined}
              onTimeChange={({ start, end }) => setPanelTimeRange({ from: start, to: end })}
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
    if (!isFilterableEmbeddable(embeddable)) return null;

    return (
      <>
        <EuiSpacer size="m" />
        <FiltersDetails onEdit={onEdit} embeddable={embeddable} editMode={editMode} />
      </>
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="embeddableApi.customizePanel.flyout.title"
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
                id="embeddableApi.customizePanel.flyout.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="saveCustomizePanelButton" onClick={save} fill>
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.saveButtonTitle"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
