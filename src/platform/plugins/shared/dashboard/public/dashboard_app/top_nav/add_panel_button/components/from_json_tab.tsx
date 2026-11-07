/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  ImportJsonEditor,
  ImportJsonServerErrorCallout,
  ImportJsonWarningsCallout,
  useImportJsonFlyoutState,
} from '@kbn/as-code-import-flyout-component';

import type { DashboardApi } from '../../../../dashboard_api/types';
import { panelJsonStrings } from '../../../../panel_json/_panel_json_strings';
import { addImportedPanels, sanitizeImportedPanels } from '../../../../panel_json/import_panels';
import type { ImportedPanels } from '../../../../panel_json/types';
import { coreServices } from '../../../../services/kibana_services';
import { getPanelAddedSuccessString } from '../../../_dashboard_app_strings';

const DATA_TEST_SUBJ_PREFIX = 'dashboardPanelJson';

const getFooterStatus = ({
  jsonText,
  hasError,
  isValid,
}: {
  jsonText: string;
  hasError: boolean;
  isValid: boolean;
}): string | undefined => {
  if (!jsonText.trim()) return panelJsonStrings.getEmptyInputStatus();
  if (hasError) return panelJsonStrings.getFixErrorsStatus();
  if (!isValid) return panelJsonStrings.getValidatingStatus();
  return undefined;
};

/** Content of the "From JSON" tab of the add panel flyout, which adds panels from pasted or uploaded JSON. */
export const FromJsonTab = ({ dashboardApi }: { dashboardApi: DashboardApi }) => {
  const addedPanelCount = useRef(0);
  const closeFlyout = useCallback(() => dashboardApi.clearOverlays(), [dashboardApi]);
  const createFromJson = useCallback(
    async (data: ImportedPanels) => {
      addedPanelCount.current = data.panels.length;
      return addImportedPanels(dashboardApi, data);
    },
    [dashboardApi]
  );
  const onImportSuccess = useCallback((_id: string, title: string) => {
    coreServices.notifications.toasts.addSuccess({
      title:
        addedPanelCount.current > 1
          ? panelJsonStrings.getPanelsAddedSuccess(addedPanelCount.current)
          : getPanelAddedSuccessString(title),
      'data-test-subj': 'addEmbeddableToDashboardSuccess',
    });
  }, []);

  const {
    jsonText,
    inputError,
    serverError,
    warnings,
    relatedItems,
    relatedItemsCount,
    sanitizedState,
    isValidating,
    isImporting,
    inputVersion,
    canImport,
    onFileChange,
    onTextChange,
    onImport,
  } = useImportJsonFlyoutState<ImportedPanels>({
    title: panelJsonStrings.getAddPanelErrorTitle(),
    closeFlyout,
    services: coreServices,
    sanitizeImportJson: sanitizeImportedPanels,
    createFromJson,
    onImportSuccess,
  });

  const footerStatus = getFooterStatus({
    jsonText,
    hasError: Boolean(inputError || serverError),
    isValid: Boolean(sanitizedState) && !isValidating,
  });

  return (
    <>
      <EuiFlyoutBody data-test-subj={`${DATA_TEST_SUBJ_PREFIX}Tab`}>
        <EuiText size="s">
          <p>{panelJsonStrings.getTabDescription()}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <ImportJsonEditor
          dataTestSubjPrefix={DATA_TEST_SUBJ_PREFIX}
          label={panelJsonStrings.getEditorLabel()}
          value={jsonText}
          error={inputError}
          isValidating={isValidating}
          onTextChange={onTextChange}
          onFileChange={onFileChange}
        />
        <EuiSpacer size="m" />
        {serverError && (
          <ImportJsonServerErrorCallout
            dataTestSubjPrefix={DATA_TEST_SUBJ_PREFIX}
            title={panelJsonStrings.getServerValidationErrorTitle()}
            text={panelJsonStrings.getServerValidationErrorText()}
            details={serverError.details}
          />
        )}
        <ImportJsonWarningsCallout
          key={inputVersion}
          dataTestSubjPrefix={DATA_TEST_SUBJ_PREFIX}
          warnings={warnings}
          relatedItems={relatedItems}
          relatedItemsCount={relatedItemsCount}
          getWarningsSummary={panelJsonStrings.getWarningsSummary}
          getMissingRelatedItemsSummary={panelJsonStrings.getMissingDataViewsSummary}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={closeFlyout}
              data-test-subj={`${DATA_TEST_SUBJ_PREFIX}CancelButton`}
            >
              {panelJsonStrings.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  color="subdued"
                  aria-live="polite"
                  data-test-subj={`${DATA_TEST_SUBJ_PREFIX}FooterStatus`}
                >
                  {footerStatus}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isDisabled={!canImport}
                  isLoading={isImporting}
                  onClick={onImport}
                  data-test-subj={`${DATA_TEST_SUBJ_PREFIX}AddButton`}
                >
                  {panelJsonStrings.getAddButtonLabel(sanitizedState?.panels.length ?? 1)}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
