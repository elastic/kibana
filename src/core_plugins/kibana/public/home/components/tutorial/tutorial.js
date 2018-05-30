/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './tutorial.less';
import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Footer } from './footer';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';
import { RadioButtonGroup } from './radio_button_group';
import { EuiSpacer, EuiPage, EuiPanel, EuiLink, EuiText } from '@elastic/eui';
import * as StatusCheckStates from './status_check_states';

const INSTRUCTIONS_TYPE = {
  ELASTIC_CLOUD: 'elasticCloud',
  ON_PREM: 'onPrem',
  ON_PREM_ELASTIC_CLOUD: 'onPremElasticCloud'
};

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      notFound: false,
      paramValues: {},
      statusCheckStates: [],
      tutorial: null
    };

    if (props.isCloudEnabled) {
      this.state.visibleInstructions = INSTRUCTIONS_TYPE.ELASTIC_CLOUD;
    } else {
      this.state.visibleInstructions = INSTRUCTIONS_TYPE.ON_PREM;
    }
  }

  componentWillMount() {
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
      this.setState({
        tutorial: tutorial
      }, this.initInstructionsState);
    } else {
      // eslint-disable-next-line react/no-did-mount-set-state
      this.setState({
        notFound: true,
      });
    }
  }

  getInstructions = () => {
    if (!this.state.tutorial) {
      return { instructionSets: [] };
    }

    switch(this.state.visibleInstructions) {
      case INSTRUCTIONS_TYPE.ELASTIC_CLOUD:
        return this.state.tutorial.elasticCloud;
      case INSTRUCTIONS_TYPE.ON_PREM:
        return this.state.tutorial.onPrem;
      case INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD:
        return this.state.tutorial.onPremElasticCloud;
      default:
        throw new Error(`Unhandled instruction type ${this.state.visibleInstructions}`);
    }
  };

  getInstructionSets = () => this.getInstructions().instructionSets;

  initInstructionsState = () => {
    const instructions = this.getInstructions();

    const paramValues = {};
    if (instructions.params) {
      instructions.params.forEach((param => {
        paramValues[param.id] = param.defaultValue;
      }));
    }

    const statusCheckStates = new Array(instructions.instructionSets.length).fill(StatusCheckStates.NOT_CHECKED);

    this.setState({
      paramValues,
      statusCheckStates,
    });
  };

  setVisibleInstructions = (instructionsType) => {
    this.setState({
      visibleInstructions: instructionsType
    }, this.initInstructionsState);
  };

  setParameter = (paramId, newValue) => {
    this.setState(previousState => {
      const paramValues = _.cloneDeep(previousState.paramValues);
      paramValues[paramId] = newValue;
      return { paramValues: paramValues };
    });
  };

  checkInstructionSetStatus = async (instructionSetIndex) => {
    const instructionSet = this.getInstructionSets()[instructionSetIndex];
    const esHitsCheckConfig = _.get(instructionSet, `statusCheck.esHitsCheck`);

    if (esHitsCheckConfig) {
      const statusCheckState = await this.fetchEsHitsStatus(esHitsCheckConfig);

      this.setState((prevState) => ({
        statusCheckStates: {
          ...prevState.statusCheckStates,
          [instructionSetIndex]: statusCheckState,
        }
      }));
    }
  };

  /**
   *
   * @param esHitsCheckConfig
   * @return {Promise<string>}
   */
  fetchEsHitsStatus = async (esHitsCheckConfig) => {
    const searchHeader = JSON.stringify({ index: esHitsCheckConfig.index });
    const searchBody = JSON.stringify({ query: esHitsCheckConfig.query, size: 1 });
    const response = await fetch(this.props.addBasePath('/elasticsearch/_msearch'), {
      method: 'post',
      body: `${searchHeader}\n${searchBody}\n`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-ndjson',
        'kbn-xsrf': 'kibana',
      },
      credentials: 'same-origin'
    });

    if (response.status > 300) {
      return StatusCheckStates.ERROR;
    }

    const results = await response.json();
    const numHits = _.get(results, 'responses.[0].hits.hits.length', 0);
    return numHits === 0 ? StatusCheckStates.NO_DATA : StatusCheckStates.HAS_DATA;
  };

  onPrem = () => {
    this.setVisibleInstructions(INSTRUCTIONS_TYPE.ON_PREM);
  };

  onPremElasticCloud = () => {
    this.setVisibleInstructions(INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD);
  };

  renderInstructionSetsToggle = () => {
    if (!this.props.isCloudEnabled && this.state.tutorial.onPremElasticCloud) {
      const radioButtons = [
        { onClick: this.onPrem, label: 'Self managed', dataTestSubj: 'onPremBtn' },
        { onClick: this.onPremElasticCloud, label: 'Elastic Cloud', dataTestSubj: 'onPremElasticCloudBtn' },
      ];
      return (
        <RadioButtonGroup
          buttons={radioButtons}
          selectedBtnLabel={radioButtons[0].label}
        />
      );
    }
  };

  onStatusCheck = (instructionSetIndex) => {
    this.setState(
      (prevState) => ({
        statusCheckStates: {
          ...prevState.statusCheckStates,
          [instructionSetIndex]: StatusCheckStates.FETCHING,
        }
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
        <InstructionSet
          title={instructionSet.title}
          instructionVariants={instructionSet.instructionVariants}
          statusCheckConfig={instructionSet.statusCheck}
          statusCheckState={this.state.statusCheckStates[index]}
          onStatusCheck={() => { this.onStatusCheck(index); }}
          offset={currentOffset}
          params={instructions.params}
          paramValues={this.state.paramValues}
          setParameter={this.setParameter}
          replaceTemplateStrings={this.props.replaceTemplateStrings}
          key={index}
        />
      );
    });
  };

  renderFooter = () => {
    let label;
    let url;
    if (_.has(this.state, 'tutorial.artifacts.application')) {
      label = this.state.tutorial.artifacts.application.label;
      url = this.props.addBasePath(this.state.tutorial.artifacts.application.path);
    } else if (_.has(this.state, 'tutorial.artifacts.dashboards')) {
      const overviewDashboard = this.state.tutorial.artifacts.dashboards.find(dashboard => {
        return dashboard.isOverview;
      });
      if (overviewDashboard) {
        label = overviewDashboard.linkLabel;
        url = this.props.addBasePath(`/app/kibana#/dashboard/${overviewDashboard.id}`);
      }
    }

    if (url && label) {
      return (
        <Footer
          label={label}
          url={url}
        />
      );
    }
  };

  render() {
    let content;
    if (this.state.notFound) {
      content = (
        <div className="homePanel">
          <EuiText>
            <p>
              Unable to find tutorial {this.props.tutorialId}
            </p>
          </EuiText>
        </div>
      );
    }

    if (this.state.tutorial) {
      let previewUrl;
      if (this.state.tutorial.previewImagePath) {
        previewUrl = this.props.addBasePath(this.state.tutorial.previewImagePath);
      }

      let exportedFieldsUrl;
      if (_.has(this.state, 'tutorial.artifacts.exportedFields')) {
        exportedFieldsUrl = this.props.replaceTemplateStrings(this.state.tutorial.artifacts.exportedFields.documentationUrl);
      }

      const instructions = this.getInstructions();
      content = (
        <div>
          <Introduction
            title={this.state.tutorial.name}
            description={this.props.replaceTemplateStrings(this.state.tutorial.longDescription)}
            previewUrl={previewUrl}
            exportedFieldsUrl={exportedFieldsUrl}
            iconType={this.state.tutorial.euiIconType}
          />

          <EuiSpacer />
          <div className="text-center">
            {this.renderInstructionSetsToggle()}
          </div>

          <EuiSpacer />
          <EuiPanel paddingSize="l">
            {this.renderInstructionSets(instructions)}
            {this.renderFooter()}
          </EuiPanel>
        </div>
      );
    }
    return (
      <EuiPage className="home">

        <EuiLink href="#/home">Home</EuiLink> / <EuiLink href="#/home/tutorial_directory">Add Data</EuiLink>
        <EuiSpacer size="s" />
        {content}
      </EuiPage>
    );
  }
}

Tutorial.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  isCloudEnabled: PropTypes.bool.isRequired,
  getTutorial: PropTypes.func.isRequired,
  replaceTemplateStrings: PropTypes.func.isRequired,
  tutorialId: PropTypes.string.isRequired,
};
