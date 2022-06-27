/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Footer } from './footer';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';
import { SavedObjectsInstaller } from './saved_objects_installer';
import { EuiSpacer, EuiPanel, EuiButton, EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import * as StatusCheckStates from './status_check_states';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getServices } from '../../kibana_services';
import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';

const INSTRUCTIONS_TYPE = {
  ELASTIC_CLOUD: 'elasticCloud',
  ON_PREM: 'onPrem',
  ON_PREM_ELASTIC_CLOUD: 'onPremElasticCloud',
};

const integrationsTitle = i18n.translate('home.breadcrumbs.integrationsAppTitle', {
  defaultMessage: 'Integrations',
});

class TutorialUi extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      notFound: false,
      paramValues: {},
      statusCheckStates: [],
      tutorial: null,
    };

    if (props.isCloudEnabled) {
      this.state.visibleInstructions = INSTRUCTIONS_TYPE.ELASTIC_CLOUD;
    } else {
      this.state.visibleInstructions = INSTRUCTIONS_TYPE.ON_PREM;
    }
  }

  UNSAFE_componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    const tutorial = await this.props.getTutorial(this.props.tutorialId);
    if (!this._isMounted) {
      return;
    }

    if (tutorial) {
      // eslint-disable-next-line react/no-did-mount-set-state
      this.setState(
        {
          tutorial: tutorial,
        },
        this.initInstructionsState
      );
    } else {
      // eslint-disable-next-line react/no-did-mount-set-state
      this.setState({
        notFound: true,
      });
    }

    getServices().chrome.setBreadcrumbs([
      {
        text: integrationsTitle,
        href: this.props.addBasePath('/app/integrations/browse'),
      },
      {
        text: tutorial ? tutorial.name : this.props.tutorialId,
      },
    ]);
  }

  getInstructions = () => {
    if (!this.state.tutorial) {
      return { instructionSets: [] };
    }

    switch (this.state.visibleInstructions) {
      case INSTRUCTIONS_TYPE.ELASTIC_CLOUD:
        return this.state.tutorial.elasticCloud;
      case INSTRUCTIONS_TYPE.ON_PREM:
        return this.state.tutorial.onPrem;
      case INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD:
        return this.state.tutorial.onPremElasticCloud;
      default:
        throw new Error(
          this.props.intl.formatMessage(
            {
              id: 'home.tutorial.unhandledInstructionTypeErrorDescription',
              defaultMessage: 'Unhandled instruction type {visibleInstructions}',
            },
            {
              visibleInstructions: this.state.visibleInstructions,
            }
          )
        );
    }
  };

  getInstructionSets = () => this.getInstructions().instructionSets;

  initInstructionsState = () => {
    const instructions = this.getInstructions();

    const paramValues = {};
    if (instructions.params) {
      instructions.params.forEach((param) => {
        paramValues[param.id] = param.defaultValue;
      });
    }

    const statusCheckStates = new Array(instructions.instructionSets.length).fill(
      StatusCheckStates.NOT_CHECKED
    );

    this.setState({
      paramValues,
      statusCheckStates,
    });
  };

  setVisibleInstructions = (instructionsType) => {
    this.setState(
      {
        visibleInstructions: instructionsType,
      },
      this.initInstructionsState
    );
  };

  setParameter = (paramId, newValue) => {
    this.setState((previousState) => {
      const paramValues = _.cloneDeep(previousState.paramValues);
      paramValues[paramId] = newValue;
      return { paramValues: paramValues };
    });
  };

  checkInstructionSetStatus = async (instructionSetIndex) => {
    const instructionSet = this.getInstructionSets()[instructionSetIndex];
    const esHitsCheckConfig = _.get(instructionSet, `statusCheck.esHitsCheck`);

    //Checks if a custom status check callback  was registered in the CLIENT
    //that matches the same name registered in the SERVER (customStatusCheckName)
    const customStatusCheckCallback = getServices().tutorialService.getCustomStatusCheck(
      this.state.tutorial.customStatusCheckName
    );

    const [esHitsStatusCheck, customStatusCheck] = await Promise.all([
      ...(esHitsCheckConfig ? [this.fetchEsHitsStatus(esHitsCheckConfig)] : []),
      ...(customStatusCheckCallback
        ? [this.fetchCustomStatusCheck(customStatusCheckCallback)]
        : []),
    ]);

    const nextStatusCheckState =
      esHitsStatusCheck === StatusCheckStates.HAS_DATA ||
      customStatusCheck === StatusCheckStates.HAS_DATA
        ? StatusCheckStates.HAS_DATA
        : StatusCheckStates.NO_DATA;

    this.setState((prevState) => ({
      statusCheckStates: {
        ...prevState.statusCheckStates,
        [instructionSetIndex]: nextStatusCheckState,
      },
    }));
  };

  fetchCustomStatusCheck = async (customStatusCheckCallback) => {
    try {
      const response = await customStatusCheckCallback();
      return response ? StatusCheckStates.HAS_DATA : StatusCheckStates.NO_DATA;
    } catch (e) {
      return StatusCheckStates.ERROR;
    }
  };

  /**
   *
   * @param esHitsCheckConfig
   * @return {Promise<string>}
   */
  fetchEsHitsStatus = async (esHitsCheckConfig) => {
    const { http } = getServices();
    try {
      const response = await http.post('/api/home/hits_status', {
        body: JSON.stringify({
          index: esHitsCheckConfig.index,
          query: esHitsCheckConfig.query,
        }),
      });
      return response.count > 0 ? StatusCheckStates.HAS_DATA : StatusCheckStates.NO_DATA;
    } catch (e) {
      return StatusCheckStates.ERROR;
    }
  };

  renderInstructionSetsToggle = () => {
    if (!this.props.isCloudEnabled && this.state.tutorial.onPremElasticCloud) {
      const selfManagedLabel = this.props.intl.formatMessage({
        id: 'home.tutorial.selfManagedButtonLabel',
        defaultMessage: 'Self managed',
      });
      const cloudLabel = this.props.intl.formatMessage({
        id: 'home.tutorial.elasticCloudButtonLabel',
        defaultMessage: 'Elastic Cloud',
      });
      const radioButtons = [
        {
          id: INSTRUCTIONS_TYPE.ON_PREM,
          label: selfManagedLabel,
          'data-test-subj': 'selfManagedTutorial',
        },
        {
          id: INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD,
          label: cloudLabel,
          'data-test-subj': 'onCloudTutorial',
        },
      ];
      return (
        <>
          <EuiSpacer />
          <EuiFormRow>
            <EuiButtonGroup
              isFullWidth
              buttonSize="m"
              options={radioButtons}
              idSelected={this.state.visibleInstructions}
              onChange={this.setVisibleInstructions}
              color="text"
              legend={i18n.translate('home.tutorial.selectionLegend', {
                defaultMessage: 'Deployment type',
              })}
            />
          </EuiFormRow>
        </>
      );
    }
  };

  onStatusCheck = (instructionSetIndex) => {
    this.setState(
      (prevState) => ({
        statusCheckStates: {
          ...prevState.statusCheckStates,
          [instructionSetIndex]: StatusCheckStates.FETCHING,
        },
      }),
      this.checkInstructionSetStatus.bind(null, instructionSetIndex)
    );
  };

  renderInstructionSets = (instructions) => {
    let offset = 1;
    return instructions.instructionSets.map((instructionSet, index) => {
      const currentOffset = offset;
      offset += instructionSet.instructionVariants[0].instructions.length;

      return (
        <Fragment key={index}>
          <InstructionSet
            title={instructionSet.title}
            callOut={instructionSet.callOut}
            instructionVariants={instructionSet.instructionVariants}
            statusCheckConfig={instructionSet.statusCheck}
            statusCheckState={this.state.statusCheckStates[index]}
            onStatusCheck={() => {
              this.onStatusCheck(index);
            }}
            offset={currentOffset}
            params={instructions.params}
            paramValues={this.state.paramValues}
            setParameter={this.setParameter}
            replaceTemplateStrings={this.props.replaceTemplateStrings}
            isCloudEnabled={this.props.isCloudEnabled}
          />
          {index < instructions.instructionSets.length - 1 && <EuiSpacer />}
        </Fragment>
      );
    });
  };

  renderSavedObjectsInstaller = () => {
    if (!this.state.tutorial.savedObjects) {
      return;
    }

    return (
      <>
        <EuiSpacer />
        <EuiPanel paddingSize="l">
          <SavedObjectsInstaller
            bulkCreate={this.props.bulkCreate}
            savedObjects={this.state.tutorial.savedObjects}
            installMsg={this.state.tutorial.savedObjectsInstallMsg}
          />
        </EuiPanel>
      </>
    );
  };

  renderFooter = () => {
    let label;
    let url;
    if (_.has(this.state, 'tutorial.artifacts.application')) {
      label = this.state.tutorial.artifacts.application.label;
      url = this.props.addBasePath(this.state.tutorial.artifacts.application.path);
    } else if (_.has(this.state, 'tutorial.artifacts.dashboards')) {
      const overviewDashboard = this.state.tutorial.artifacts.dashboards.find((dashboard) => {
        return dashboard.isOverview;
      });
      if (overviewDashboard) {
        label = overviewDashboard.linkLabel;
        url = this.props.addBasePath(`/app/dashboards#/view/${overviewDashboard.id}`);
      }
    }

    if (url && label) {
      return (
        <>
          <EuiSpacer />
          <EuiPanel paddingSize="l">
            <Footer label={label} url={url} />
          </EuiPanel>
        </>
      );
    }
  };

  renderModuleNotices() {
    const notices = getServices().tutorialService.getModuleNotices();
    if (notices.length && this.state.tutorial.moduleName) {
      return notices.map((ModuleNotice, index) => (
        <ModuleNotice key={index} moduleName={this.state.tutorial.moduleName} />
      ));
    } else {
      return null;
    }
  }

  render() {
    let content;
    if (this.state.notFound) {
      content = (
        <KibanaPageTemplate
          isEmptyState={true}
          pageHeader={{
            iconType: 'faceSad',
            iconProps: {
              color: 'subdued',
            },
            pageTitle: (
              <FormattedMessage
                id="home.tutorial.noTutorialLabel"
                defaultMessage="Unable to find tutorial {tutorialId}"
                values={{ tutorialId: this.props.tutorialId }}
              />
            ),
            rightSideItems: [
              <EuiButton
                href={this.props.addBasePath('/app/home#/tutorial_directory')}
                fill
                iconType="sortLeft"
                iconSide="left"
              >
                {i18n.translate('home.tutorial.backToDirectory', {
                  defaultMessage: 'Back to directory',
                })}
              </EuiButton>,
            ],
          }}
        />
      );
    }

    if (this.state.tutorial) {
      let previewUrl;
      if (this.state.tutorial.previewImagePath) {
        previewUrl = this.props.addBasePath(this.state.tutorial.previewImagePath);
      }

      let exportedFieldsUrl;
      if (_.has(this.state, 'tutorial.artifacts.exportedFields')) {
        exportedFieldsUrl = this.props.replaceTemplateStrings(
          this.state.tutorial.artifacts.exportedFields.documentationUrl
        );
      }

      let icon = this.state.tutorial.euiIconType;
      if (icon && icon.includes('/')) {
        icon = this.props.addBasePath(icon);
      }

      const instructions = this.getInstructions();
      content = (
        <div>
          <Introduction
            category={this.state.tutorial.category}
            title={this.state.tutorial.name}
            description={this.props.replaceTemplateStrings(this.state.tutorial.longDescription)}
            previewUrl={previewUrl}
            exportedFieldsUrl={exportedFieldsUrl}
            iconType={icon}
            isBeta={this.state.tutorial.isBeta}
            notices={this.renderModuleNotices()}
            basePath={getServices().http.basePath}
          />

          {this.renderInstructionSetsToggle()}

          <EuiSpacer />
          {this.renderInstructionSets(instructions)}
          {this.renderSavedObjectsInstaller()}
          {this.renderFooter()}
        </div>
      );
    }

    return <KibanaPageTemplate template="empty">{content}</KibanaPageTemplate>;
  }
}

TutorialUi.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  isCloudEnabled: PropTypes.bool.isRequired,
  getTutorial: PropTypes.func.isRequired,
  replaceTemplateStrings: PropTypes.func.isRequired,
  tutorialId: PropTypes.string.isRequired,
  bulkCreate: PropTypes.func.isRequired,
};

export const Tutorial = injectI18n(TutorialUi);
