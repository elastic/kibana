/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent } from 'react';

import {
  // EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { generateConnectorName } from '../../utils/generate_connector_name';
import { Connector } from '../../types';

// import * as Constants from '../../../../shared/constants';
// import { GeneratedConfigFields } from '../../connector_detail/components/generated_config_fields';

// import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';
// import { NewConnectorLogic } from '../../new_index/method_connector/new_connector_logic';

// import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
// import { ConnectorDescriptionPopover } from './components/connector_description_popover';
// import { ManualConfiguration } from './components/manual_configuration';
import { SelfManagePreference } from './create_connector';

interface StartStepProps {
  connector: Connector;
  useConnectorTypes: Function;
  error?: string | React.ReactNode;
  onSelfManagePreferenceChange(preference: SelfManagePreference): void;
  selfManagePreference: SelfManagePreference;
  setCurrentStep: Function;
  // rawName: string;
  title: string;
}

export const StartStep: React.FC<StartStepProps> = ({
  connector,
  useConnectorTypes,
  title,
  selfManagePreference,
  setCurrentStep,
  onSelfManagePreferenceChange,
  // rawName,
  error,
}) => {
  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  // const connectorTypes = useConnectorTypes();

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    connector.name = e.target.value;
  };

  return (
    <EuiForm component="form" id="enterprise-search-create-connector">
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              {/* <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.connectorLabel',
                    { defaultMessage: 'Connector' }
                  )}
                >
                  <ChooseConnectorSelectable selfManaged={selfManagePreference} />
                </EuiFormRow>
              </EuiFlexItem> */}
              <EuiFlexItem>
                {/* <EuiFormRow
                  fullWidth
                  isInvalid={!!error}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.connectorNameLabel',
                    { defaultMessage: 'Connector name' }
                  )}
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchStartStepFieldText"
                    fullWidth
                    name="first"
                    value={rawName}
                    onChange={handleNameChange}
                    onBlur={() => {
                      if (selectedConnector) {
                        generateConnectorName(client, rawName, selectedConnector.serviceType);
                      }
                    }}
                  />
                </EuiFormRow> */}
                {/* TODO: NAV -- CONNECTOR NAME NEEDS TO BE GENERATED OUTSIDE OF THIS */}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.descriptionLabel',
                  { defaultMessage: 'Description' }
                )}
              >
                <EuiFieldText
                  data-test-subj="enterpriseSearchStartStepFieldText"
                  fullWidth
                  name="first"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
        {/* Set up */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.createConnector.startStep.h4.setUpLabel', {
                  defaultMessage: 'Set up',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.startStep.p.whereDoYouWantLabel',
                  {
                    defaultMessage:
                      'Where do you want to store the connector and how do you want to manage it?',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              {/* <EuiFlexItem grow={false}>
                <EuiRadio
                  id={elasticManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiRadio.elasticManagedLabel',
                    { defaultMessage: 'Elastic managed' }
                  )}
                  checked={selfManagePreference === 'native'}
                  disabled={selectedConnector?.isNative === false}
                  onChange={() => onSelfManagePreferenceChange('native')}
                  name="setUp"
                />
              </EuiFlexItem> */}
              {/* <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover
                  isDisabled={selectedConnector?.isNative === false}
                  isNative
                />
              </EuiFlexItem> */}
              &nbsp; &nbsp;
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={selfManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiRadio.selfManagedLabel',
                    { defaultMessage: 'Self managed' }
                  )}
                  checked={selfManagePreference === 'selfManaged'}
                  onChange={() => onSelfManagePreferenceChange('selfManaged')}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* <ConnectorDescriptionPopover isDisabled={false} isNative={false} /> */}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {selfManagePreference === 'selfManaged' ? (
          // <EuiFlexItem>
          //   <EuiPanel
          //     hasShadow={false}
          //     hasBorder
          //     paddingSize="l"
          //     color={selectedConnector?.name ? 'plain' : 'subdued'}
          //   >
          //     <EuiText color={selectedConnector?.name ? 'default' : 'subdued'}>
          //       <h3>
          //         {i18n.translate(
          //           'xpack.enterpriseSearch.createConnector.startStep.h4.deploymentLabel',
          //           {
          //             defaultMessage: 'Deployment',
          //           }
          //         )}
          //       </h3>
          //     </EuiText>
          //     <EuiSpacer size="m" />
          //     <EuiText color={selectedConnector?.name ? 'default' : 'subdued'} size="s">
          //       <p>
          //         {i18n.translate(
          //           'xpack.enterpriseSearch.createConnector.startStep.p.youWillStartTheLabel',
          //           {
          //             defaultMessage:
          //               'You will start the process of creating a new index, API key, and a Web Crawler Connector ID manually. Optionally you can bring your own configuration as well.',
          //           }
          //         )}
          //       </p>
          //     </EuiText>
          //     <EuiSpacer size="m" />
          //     <EuiButton
          //       data-test-subj="enterpriseSearchStartStepNextButton"
          //       onClick={() => {
          //         if (selectedConnector && selectedConnector.name) {
          //           createConnector({
          //             isSelfManaged: true,
          //           });
          //           setCurrentStep('deployment');
          //         }
          //       }}
          //       fill
          //       disabled={!canConfigureConnector}
          //       isLoading={isCreateLoading || isGenerateLoading}
          //     >
          //       {Constants.NEXT_BUTTON_LABEL}
          //     </EuiButton>
          //   </EuiPanel>
          // </EuiFlexItem>
          <></>
        ) : (
          // <EuiFlexItem>
          //   <EuiPanel
          //     color={selectedConnector?.name ? 'plain' : 'subdued'}
          //     hasShadow={false}
          //     hasBorder
          //     paddingSize="l"
          //   >
          //     <EuiText color={selectedConnector?.name ? 'default' : 'subdued'}>
          //       <h3>
          //         {i18n.translate(
          //           'xpack.enterpriseSearch.createConnector.startStep.h4.configureIndexAndAPILabel',
          //           {
          //             defaultMessage: 'Configure index and API key',
          //           }
          //         )}
          //       </h3>
          //     </EuiText>
          //     <EuiSpacer size="m" />
          //     <EuiText color={selectedConnector?.name ? 'default' : 'subdued'} size="s">
          //       <p>
          //         {i18n.translate(
          //           'xpack.enterpriseSearch.createConnector.startStep.p.thisProcessWillCreateLabel',
          //           {
          //             defaultMessage:
          //               'This process will create a new index, API key, and a Connector ID. Optionally you can bring your own configuration as well.',
          //           }
          //         )}
          //       </p>
          //     </EuiText>
          //     <EuiSpacer size="m" />
          //     {generatedConfigData && connector ? (
          //       <>
          //         <GeneratedConfigFields
          //           apiKey={{
          //             api_key: generatedConfigData.apiKey.api_key,
          //             encoded: generatedConfigData.apiKey.encoded,
          //             id: generatedConfigData.apiKey.id,
          //             name: generatedConfigData.apiKey.name,
          //           }}
          //           connector={connector}
          //           isGenerateLoading={false}
          //         />
          //         <EuiSpacer size="m" />
          //         <EuiButton
          //           data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
          //           fill
          //           onClick={() => setCurrentStep('configure')}
          //         >
          //           {Constants.NEXT_BUTTON_LABEL}
          //         </EuiButton>
          //       </>
          //     ) : (
          //       <EuiFlexGroup gutterSize="xs">
          //         <EuiFlexItem grow={false}>
          //           <EuiButton
          //             data-test-subj="entSearchContent-connector-configuration-generateConfigButton"
          //             data-telemetry-id="entSearchContent-connector-configuration-generateConfigButton"
          //             disabled={!canConfigureConnector}
          //             fill
          //             iconType="sparkles"
          //             isLoading={isGenerateLoading || isCreateLoading}
          //             onClick={() => {
          //               createConnector({
          //                 isSelfManaged: false,
          //               });
          //             }}
          //           >
          //             {i18n.translate(
          //               'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.button.label',
          //               {
          //                 defaultMessage: 'Generate configuration',
          //               }
          //             )}
          //           </EuiButton>
          //         </EuiFlexItem>
          //         <EuiFlexItem grow={false}>
          //           <ManualConfiguration
          //             isDisabled={isGenerateLoading || isCreateLoading || !canConfigureConnector}
          //             selfManagePreference={selfManagePreference}
          //           />
          //         </EuiFlexItem>
          //       </EuiFlexGroup>
          //     )}
          //   </EuiPanel>
          // </EuiFlexItem>
          <></>
        )}
      </EuiFlexGroup>
    </EuiForm>
  );
};
