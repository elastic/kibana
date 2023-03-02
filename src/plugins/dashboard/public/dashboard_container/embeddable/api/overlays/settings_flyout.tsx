/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiForm,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pluginServices } from '../../../../services/plugin_services';
import { useDashboardContainerContext } from '../../../dashboard_container_renderer';
import { DashboardOptions } from './options';

interface DashboardSettingsProps {
  onClose: () => void;
}

export const DashboardSettings = ({ onClose }: DashboardSettingsProps) => {
  const {
    savedObjectsTagging: { components },
  } = pluginServices.getServices();

  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setStateFromSaveModal },
    embeddableInstance: dashboardContainer,
  } = useDashboardContainerContext();

  const [dashboardSettingsState, setDashboardSettingsState] = useState({
    ...dashboardContainer.getInputAsValueType(),
  });

  const lastSavedId = select((state) => state.componentState.lastSavedId);

  const updateDashboardSetting = useCallback(
    (newSettings) => {
      setDashboardSettingsState({
        ...dashboardSettingsState,
        ...newSettings,
      });
    },
    [dashboardSettingsState]
  );

  const dispatch = useEmbeddableDispatch();

  const renderTagSelector = () => {
    if (!components) return;
    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="dashboardSettings.embeddableApi.flyout.optionsMenuForm.tagsFormRowLabel"
            defaultMessage="Tags"
          />
        }
      >
        <components.TagSelector
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
              id="dashboardContainer.embeddableApi.showSettings.flyout.title"
              defaultMessage="Dashboard settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm data-test-subj="dashboardSettingsPanel">
          <EuiFormRow
            label={
              <FormattedMessage
                id="dashboardSettings.embeddableApi.flyout.optionsMenuForm.panelTitleFormRowLabel"
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
              onChange={(event) => updateDashboardSetting({ title: event.target.value })}
              aria-label={i18n.translate(
                'dashboardSettings.embeddableApi.flyout.optionsMenuForm.panelTitleInputAriaLabel',
                {
                  defaultMessage: 'Change the dashboard title',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="dashboardSettings.embeddableApi.flyout.optionsMenuForm.panelDescriptionFormRowLabel"
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
                'dashboardSettings.embeddableApi.flyout.optionsMenuForm.panelDescriptionAriaLabel',
                {
                  defaultMessage: 'Change the dashboard description',
                }
              )}
            />
          </EuiFormRow>
          {renderTagSelector()}
          <DashboardOptions
            initialInput={dashboardSettingsState}
            updateDashboardSetting={updateDashboardSetting}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="cancelCustomizeDashboardButton"
              onClick={() => onClose()}
            >
              <FormattedMessage
                id="dashboardContainer.embeddableApi.showSettings.flyout.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="saveCustomizePanelButton"
              onClick={() => {
                dispatch(setStateFromSaveModal({ lastSavedId, ...dashboardSettingsState }));
                onClose();
              }}
              fill
            >
              <FormattedMessage
                id="dashboardContainer.embeddableApi.showSettings.flyout.saveButtonTitle"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
