/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DashboardContainerInput } from '../../../../common';
import { savedObjectsTaggingService } from '../../../services/kibana_services';
import { pluginServices } from '../../../services/plugin_services';
import { useDashboardContainer } from '../../embeddable/dashboard_container';

interface DashboardSettingsProps {
  onClose: () => void;
}

const DUPLICATE_TITLE_CALLOUT_ID = 'duplicateTitleCallout';

export const DashboardSettings = ({ onClose }: DashboardSettingsProps) => {
  const {
    dashboardContentManagement: { checkForDuplicateDashboardTitle },
  } = pluginServices.getServices();

  const dashboard = useDashboardContainer();

  const [dashboardSettingsState, setDashboardSettingsState] = useState({
    ...dashboard.getInput(),
  });

  const [isTitleDuplicate, setIsTitleDuplicate] = useState(false);
  const [isTitleDuplicateConfirmed, setIsTitleDuplicateConfirmed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const lastSavedId = dashboard.select((state) => state.componentState.lastSavedId);
  const lastSavedTitle = dashboard.select((state) => state.explicitInput.title);

  const isMounted = useMountedState();

  const onTitleDuplicate = () => {
    if (!isMounted()) return;
    setIsTitleDuplicate(true);
    setIsTitleDuplicateConfirmed(true);
  };

  const onApply = async () => {
    setIsApplying(true);
    const validTitle = await checkForDuplicateDashboardTitle({
      title: dashboardSettingsState.title,
      copyOnSave: false,
      lastSavedTitle,
      onTitleDuplicate,
      isTitleDuplicateConfirmed,
    });

    if (!isMounted()) return;

    setIsApplying(false);

    if (validTitle) {
      dashboard.dispatch.setStateFromSettingsFlyout({ lastSavedId, ...dashboardSettingsState });
      onClose();
    }
  };

  const updateDashboardSetting = useCallback((newSettings: Partial<DashboardContainerInput>) => {
    setDashboardSettingsState((prevDashboardSettingsState) => {
      return {
        ...prevDashboardSettingsState,
        ...newSettings,
      };
    });
  }, []);

  const renderDuplicateTitleCallout = () => {
    if (!isTitleDuplicate) {
      return;
    }

    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="dashboard.embeddableApi.showSettings.flyout.form.duplicateTitleLabel"
            defaultMessage="This dashboard already exists"
          />
        }
        color="warning"
        data-test-subj="duplicateTitleWarningMessage"
        id={DUPLICATE_TITLE_CALLOUT_ID}
      >
        <p>
          <FormattedMessage
            id="dashboard.embeddableApi.showSettings.flyout.form.duplicateTitleDescription"
            defaultMessage="Saving ''{title}'' creates a duplicate title."
            values={{
              title: dashboardSettingsState.title,
            }}
          />
        </p>
      </EuiCallOut>
    );
  };

  const renderTagSelector = () => {
    const api = savedObjectsTaggingService?.getTaggingApi();
    if (!api) return;

    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="dashboard.embeddableApi.showSettings.flyout.form.tagsFormRowLabel"
            defaultMessage="Tags"
          />
        }
      >
        <api.ui.components.TagSelector
          selected={dashboardSettingsState.tags}
          onTagsSelected={(selectedTags) => updateDashboardSetting({ tags: selectedTags })}
        />
      </EuiFormRow>
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="dashboard.embeddableApi.showSettings.flyout.title"
              defaultMessage="Dashboard settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {renderDuplicateTitleCallout()}
        <EuiForm data-test-subj="dashboardSettingsPanel">
          <EuiFormRow
            label={
              <FormattedMessage
                id="dashboard.embeddableApi.showSettings.flyout.form.panelTitleFormRowLabel"
                defaultMessage="Title"
              />
            }
          >
            <EuiFieldText
              id="dashboardTitleInput"
              className="dashboardTitleInputText"
              data-test-subj="dashboardTitleInput"
              name="title"
              type="text"
              value={dashboardSettingsState.title}
              onChange={(event) => {
                setIsTitleDuplicate(false);
                setIsTitleDuplicateConfirmed(false);
                updateDashboardSetting({ title: event.target.value });
              }}
              aria-label={i18n.translate(
                'dashboard.embeddableApi.showSettings.flyout.form.panelTitleInputAriaLabel',
                {
                  defaultMessage: 'Change the dashboard title',
                }
              )}
              aria-describedby={isTitleDuplicate ? DUPLICATE_TITLE_CALLOUT_ID : undefined}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="dashboard.embeddableApi.showSettings.flyout.form.panelDescriptionFormRowLabel"
                defaultMessage="Description"
              />
            }
          >
            <EuiTextArea
              id="dashboardDescriptionInput"
              className="dashboardDescriptionInputText"
              data-test-subj="dashboardDescriptionInput"
              name="description"
              value={dashboardSettingsState.description ?? ''}
              onChange={(event) => updateDashboardSetting({ description: event.target.value })}
              aria-label={i18n.translate(
                'dashboard.embeddableApi.showSettings.flyout.form.panelDescriptionAriaLabel',
                {
                  defaultMessage: 'Change the dashboard description',
                }
              )}
            />
          </EuiFormRow>
          {renderTagSelector()}
          <EuiFormRow
            helpText={
              <FormattedMessage
                id="dashboard.embeddableApi.showSettings.flyout.form.storeTimeWithDashboardFormRowHelpText"
                defaultMessage="This changes the time filter to the currently selected time each time this dashboard is loaded."
              />
            }
          >
            <EuiSwitch
              data-test-subj="storeTimeWithDashboard"
              checked={dashboardSettingsState.timeRestore}
              onChange={(event) => updateDashboardSetting({ timeRestore: event.target.checked })}
              label={
                <FormattedMessage
                  id="dashboard.embeddableApi.showSettings.flyout.form.storeTimeWithDashboardFormRowLabel"
                  defaultMessage="Store time with dashboard"
                />
              }
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate(
                'dashboard.embeddableApi.showSettings.flyout.form.useMarginsBetweenPanelsSwitchLabel',
                {
                  defaultMessage: 'Use margins between panels',
                }
              )}
              checked={dashboardSettingsState.useMargins}
              onChange={(event) => updateDashboardSetting({ useMargins: event.target.checked })}
              data-test-subj="dashboardMarginsCheckbox"
            />
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate(
                'dashboard.embeddableApi.showSettings.flyout.form.hideAllPanelTitlesSwitchLabel',
                {
                  defaultMessage: 'Show panel titles',
                }
              )}
              checked={!dashboardSettingsState.hidePanelTitles}
              onChange={(event) =>
                updateDashboardSetting({ hidePanelTitles: !event.target.checked })
              }
              data-test-subj="dashboardPanelTitlesCheckbox"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate(
              'dashboard.embeddableApi.showSettings.flyout.formRow.syncAcrossPanelsLabel',
              {
                defaultMessage: 'Sync across panels',
              }
            )}
          >
            <>
              <EuiFormRow>
                <EuiSwitch
                  label={
                    <EuiText size="s">
                      {i18n.translate(
                        'dashboard.embeddableApi.showSettings.flyout.form.syncColorsBetweenPanelsSwitchLabel',
                        {
                          defaultMessage: 'Sync color palettes across panels',
                        }
                      )}{' '}
                      <EuiIconTip
                        color="subdued"
                        content={
                          <FormattedMessage
                            id="dashboard.embeddableApi.showSettings.flyout.form.syncColorsBetweenPanelsSwitchHelp"
                            defaultMessage="Only valid for {default} and {compatibility} palettes"
                            values={{
                              default: (
                                <strong>
                                  {i18n.translate('dashboard.palettes.defaultPaletteLabel', {
                                    defaultMessage: 'Default',
                                  })}
                                </strong>
                              ),
                              compatibility: (
                                <strong>
                                  {i18n.translate('dashboard.palettes.kibanaPaletteLabel', {
                                    defaultMessage: 'Compatibility',
                                  })}
                                </strong>
                              ),
                            }}
                          />
                        }
                        iconProps={{
                          className: 'eui-alignTop',
                        }}
                        position="top"
                        size="s"
                        type="questionInCircle"
                      />
                    </EuiText>
                  }
                  checked={dashboardSettingsState.syncColors}
                  onChange={(event) => updateDashboardSetting({ syncColors: event.target.checked })}
                  data-test-subj="dashboardSyncColorsCheckbox"
                />
              </EuiFormRow>
              <EuiFormRow>
                <EuiSwitch
                  label={i18n.translate(
                    'dashboard.embeddableApi.showSettings.flyout.form.syncCursorBetweenPanelsSwitchLabel',
                    {
                      defaultMessage: 'Sync cursor across panels',
                    }
                  )}
                  checked={dashboardSettingsState.syncCursor}
                  onChange={(event) => {
                    const syncCursor = event.target.checked;
                    if (!syncCursor && dashboardSettingsState.syncTooltips) {
                      updateDashboardSetting({ syncCursor, syncTooltips: false });
                    } else {
                      updateDashboardSetting({ syncCursor });
                    }
                  }}
                  data-test-subj="dashboardSyncCursorCheckbox"
                />
              </EuiFormRow>
              <EuiFormRow>
                <EuiSwitch
                  label={i18n.translate(
                    'dashboard.embeddableApi.showSettings.flyout.form.syncTooltipsBetweenPanelsSwitchLabel',
                    {
                      defaultMessage: 'Sync tooltips across panels',
                    }
                  )}
                  checked={dashboardSettingsState.syncTooltips}
                  disabled={!Boolean(dashboardSettingsState.syncCursor)}
                  onChange={(event) =>
                    updateDashboardSetting({ syncTooltips: event.target.checked })
                  }
                  data-test-subj="dashboardSyncTooltipsCheckbox"
                />
              </EuiFormRow>
            </>
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="cancelCustomizeDashboardButton"
              onClick={onClose}
            >
              <FormattedMessage
                id="dashboard.embeddableApi.showSettings.flyout.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="applyCustomizeDashboardButton"
              onClick={onApply}
              fill
              aria-describedby={isTitleDuplicate ? DUPLICATE_TITLE_CALLOUT_ID : undefined}
              isLoading={isApplying}
            >
              {isTitleDuplicate ? (
                <FormattedMessage
                  id="dashboard.embeddableApi.showSettings.flyout.confirmApplyButtonTitle"
                  defaultMessage="Confirm and apply"
                />
              ) : (
                <FormattedMessage
                  id="dashboard.embeddableApi.showSettings.flyout.applyButtonTitle"
                  defaultMessage="Apply"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
