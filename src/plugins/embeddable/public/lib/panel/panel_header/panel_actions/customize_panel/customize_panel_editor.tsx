/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiForm,
  EuiTextArea,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { TimeRangeInput } from './customize_panel_action';
import {
  IContainer,
  ContainerInput,
  IEmbeddable,
  Embeddable,
  EmbeddableOutput,
  TimePickerRange,
} from '../../../..';

type PanelSettings = {
  title?: string;
  hideTitle?: boolean;
  description?: string;
  timeRange?: TimeRange;
};

interface CustomizePanelProps {
  embeddable: IEmbeddable;
  dateFormat?: string;
  commonlyUsedRanges: TimePickerRange[];
  updatePanelSettings: (panelSettings: PanelSettings) => void;
  cancel: () => void;
}

const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';

type VisualizeEmbeddable = IEmbeddable<{ id: string }, EmbeddableOutput & { visTypeName: string }>;

function isVisualizeEmbeddable(
  embeddable: IEmbeddable | VisualizeEmbeddable
): embeddable is VisualizeEmbeddable {
  return embeddable.type === VISUALIZE_EMBEDDABLE_TYPE;
}

function isTimeRangeCompatible(embeddable: IEmbeddable) {
  const isInputControl =
    isVisualizeEmbeddable(embeddable) &&
    (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'input_control_vis';

  const isMarkdown =
    isVisualizeEmbeddable(embeddable) &&
    (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'markdown';

  const isImage = embeddable.type === 'image';

  return Boolean(
    embeddable &&
      embeddable.parent &&
      hasTimeRange(embeddable) &&
      !isInputControl &&
      !isMarkdown &&
      !isImage
  );
}

function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

function doesInheritTimeRange(embeddable: IEmbeddable) {
  if (!embeddable.parent) {
    return false;
  }

  const parent = embeddable.parent as IContainer<{}, ContainerInput<TimeRangeInput>>;

  // if it's a dashboard emptys screen, there will be no embeddable
  if (!parent.getInput().panels[embeddable.id]) {
    return false;
  }
  // If there is no explicit input defined on the parent then this embeddable inherits the
  // time range from whatever the time range of the parent is.
  return parent.getInput().panels[embeddable.id].explicitInput.timeRange === undefined;
}

export const CustomizePanelEditor = (props: CustomizePanelProps) => {
  const { cancel, updatePanelSettings, embeddable } = props;
  const timeRangeCompatible = isTimeRangeCompatible(embeddable);
  const [hideTitle, setHideTitle] = useState(embeddable.getInput().hidePanelTitles);
  const [description, setDescription] = useState(
    embeddable.getInput().description ?? embeddable.getOutput().defaultDescription
  );
  const [title, setTitle] = useState(
    embeddable.getInput().title ?? embeddable.getOutput().defaultTitle
  );
  const [inheritTimeRange, setInheritTimeRange] = useState(
    timeRangeCompatible ? doesInheritTimeRange(embeddable) : false
  );
  const [timeRange, setTimeRange] = useState(
    timeRangeCompatible
      ? (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange
      : undefined
  );

  const save = () => {
    const newTitle = title === embeddable.getOutput().defaultTitle ? undefined : title;
    const newDescription =
      description === embeddable.getOutput().defaultDescription ? undefined : description;
    const newPanelSettings: PanelSettings = {
      title: newTitle,
      hideTitle,
      description: newDescription,
    };
    if (Boolean(timeRangeCompatible)) {
      newPanelSettings.timeRange = !inheritTimeRange ? timeRange : undefined;
    }
    updatePanelSettings(newPanelSettings);
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="embeddableApi.customizePanel.flyout.title"
              defaultMessage="Edit panel settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow>
            <EuiSwitch
              checked={!hideTitle}
              data-test-subj="customizePanelHideTitle"
              id="hideTitle"
              label={
                <FormattedMessage
                  defaultMessage="Show panel title"
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
                defaultMessage="Panel title"
              />
            }
            labelAppend={
              <EuiButtonEmpty
                size="xs"
                data-test-subj="resetCustomEmbeddablePanelTitle"
                onClick={() => setTitle(embeddable.getOutput().defaultTitle ?? '')}
                disabled={hideTitle}
                aria-label={i18n.translate(
                  'embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonAriaLabel',
                  {
                    defaultMessage: 'Reset panel title',
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
              id="panelTitleInput"
              className="panelTitleInputText"
              data-test-subj="customEmbeddablePanelTitleInput"
              name="title"
              type="text"
              disabled={hideTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
                defaultMessage="Panel description"
              />
            }
            labelAppend={
              <EuiButtonEmpty
                size="xs"
                data-test-subj="resetCustomEmbeddablePanelTitle"
                onClick={() => setDescription(embeddable.getOutput().defaultDescription ?? '')}
                disabled={hideTitle}
                aria-label={i18n.translate(
                  'embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomDescriptionButtonAriaLabel',
                  {
                    defaultMessage: 'Reset panel description',
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
              disabled={hideTitle}
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label={i18n.translate(
                'embeddableApi.customizePanel.flyout.optionsMenuForm.panelDescriptionAriaLabel',
                {
                  defaultMessage: 'Enter a custom description for your panel',
                }
              )}
            />
          </EuiFormRow>
          {timeRangeCompatible ? (
            <>
              <EuiFormRow>
                <EuiSwitch
                  checked={!inheritTimeRange}
                  data-test-subj="customizePanelShowCustomTimeRange"
                  id="hideTitle"
                  label={
                    <FormattedMessage
                      defaultMessage="Apply custom time range to panel"
                      id="embeddableApi.customizePanel.flyout.optionsMenuForm.showCustomTimeRangeSwitch"
                    />
                  }
                  onChange={(e) => setInheritTimeRange(!e.target.checked)}
                />
              </EuiFormRow>
              {!inheritTimeRange ? (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="uiActionsEnhanced.customizePanel.flyout.optionsMenuForm.panelTimeRangeFormRowLabel"
                      defaultMessage="Panel time range"
                    />
                  }
                >
                  <EuiSuperDatePicker
                    start={timeRange?.from ?? undefined}
                    end={timeRange?.to ?? undefined}
                    onTimeChange={({ start, end }) => setTimeRange({ from: start, to: end })}
                    showUpdateButton={false}
                    dateFormat={props.dateFormat}
                    commonlyUsedRanges={props.commonlyUsedRanges.map(
                      ({ from, to, display }: { from: string; to: string; display: string }) => {
                        return {
                          start: from,
                          end: to,
                          label: display,
                        };
                      }
                    )}
                    data-test-subj="customizePanelTimeRangeDatePicker"
                  />
                </EuiFormRow>
              ) : null}
            </>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={cancel}>
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="saveNewTitleButton" onClick={save} fill>
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.saveButtonTitle"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
