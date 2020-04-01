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

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { EuiGlobalToastList } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { StepIndexPattern } from './components/step_index_pattern';
import { StepTimeField } from './components/step_time_field';
import { Header } from './components/header';
import { LoadingState } from './components/loading_state';
import { EmptyState } from './components/empty_state';

import { MAX_SEARCH_SIZE } from './constants';
import { ensureMinimumTime, getIndices } from './lib';
import { i18n } from '@kbn/i18n';

export class CreateIndexPatternWizard extends Component {
  static propTypes = {
    initialQuery: PropTypes.string,
    services: PropTypes.shape({
      es: PropTypes.object.isRequired,
      indexPatterns: PropTypes.object.isRequired,
      savedObjectsClient: PropTypes.object.isRequired,
      indexPatternCreationType: PropTypes.object.isRequired,
      config: PropTypes.object.isRequired,
      changeUrl: PropTypes.func.isRequired,
      openConfirm: PropTypes.func.isRequired,
    }).isRequired,
  };

  constructor(props) {
    super(props);
    this.indexPatternCreationType = this.props.services.indexPatternCreationType;
    this.state = {
      step: 1,
      indexPattern: '',
      allIndices: [],
      remoteClustersExist: false,
      isInitiallyLoadingIndices: true,
      isIncludingSystemIndices: false,
      toasts: [],
    };
  }

  async UNSAFE_componentWillMount() {
    this.fetchData();
  }

  catchAndWarn = async (asyncFn, errorValue, errorMsg) => {
    try {
      return await asyncFn;
    } catch (errors) {
      this.setState(prevState => ({
        toasts: prevState.toasts.concat([
          {
            title: errorMsg,
            id: errorMsg.props.id,
            color: 'warning',
            iconType: 'alert',
          },
        ]),
      }));
      return errorValue;
    }
  };

  fetchData = async () => {
    const { services } = this.props;

    this.setState({
      allIndices: [],
      isInitiallyLoadingIndices: true,
      remoteClustersExist: false,
    });

    const indicesFailMsg = (
      <FormattedMessage
        id="kbn.management.createIndexPattern.loadIndicesFailMsg"
        defaultMessage="Failed to load indices"
      />
    );

    const clustersFailMsg = (
      <FormattedMessage
        id="kbn.management.createIndexPattern.loadClustersFailMsg"
        defaultMessage="Failed to load remote clusters"
      />
    );

    // query local and remote indices, updating state independently
    ensureMinimumTime(
      this.catchAndWarn(
        getIndices(services.es, this.indexPatternCreationType, `*`, MAX_SEARCH_SIZE),
        [],
        indicesFailMsg
      )
    ).then(allIndices => this.setState({ allIndices, isInitiallyLoadingIndices: false }));

    this.catchAndWarn(
      // if we get an error from remote cluster query, supply fallback value that allows user entry.
      // ['a'] is fallback value
      getIndices(services.es, this.indexPatternCreationType, `*:*`, 1),
      ['a'],
      clustersFailMsg
    ).then(remoteIndices => this.setState({ remoteClustersExist: !!remoteIndices.length }));
  };

  createIndexPattern = async (timeFieldName, indexPatternId) => {
    const { services } = this.props;
    const { indexPattern } = this.state;

    const emptyPattern = await services.indexPatterns.make();

    Object.assign(emptyPattern, {
      id: indexPatternId,
      title: indexPattern,
      timeFieldName,
      ...this.indexPatternCreationType.getIndexPatternMappings(),
    });

    const createdId = await emptyPattern.create();
    if (!createdId) {
      const confirmMessage = i18n.translate('kbn.management.indexPattern.titleExistsLabel', {
        values: { title: this.title },
        defaultMessage: "An index pattern with the title '{title}' already exists.",
      });

      const isConfirmed = await services.openConfirm(confirmMessage, {
        confirmButtonText: i18n.translate('kbn.management.indexPattern.goToPatternButtonLabel', {
          defaultMessage: 'Go to existing pattern',
        }),
      });

      if (isConfirmed) {
        return services.changeUrl(`/management/kibana/index_patterns/${indexPatternId}`);
      } else {
        return false;
      }
    }

    if (!services.config.get('defaultIndex')) {
      await services.config.set('defaultIndex', createdId);
    }

    services.indexPatterns.clearCache(createdId);
    services.changeUrl(`/management/kibana/index_patterns/${createdId}`);
  };

  goToTimeFieldStep = indexPattern => {
    this.setState({ step: 2, indexPattern });
  };

  goToIndexPatternStep = () => {
    this.setState({ step: 1 });
  };

  onChangeIncludingSystemIndices = () => {
    this.setState(state => ({
      isIncludingSystemIndices: !state.isIncludingSystemIndices,
    }));
  };

  renderHeader() {
    const { isIncludingSystemIndices } = this.state;

    return (
      <Header
        prompt={this.indexPatternCreationType.renderPrompt()}
        showSystemIndices={this.indexPatternCreationType.getShowSystemIndices()}
        isIncludingSystemIndices={isIncludingSystemIndices}
        onChangeIncludingSystemIndices={this.onChangeIncludingSystemIndices}
        indexPatternName={this.indexPatternCreationType.getIndexPatternName()}
        isBeta={this.indexPatternCreationType.getIsBeta()}
      />
    );
  }

  renderContent() {
    const {
      allIndices,
      isInitiallyLoadingIndices,
      isIncludingSystemIndices,
      step,
      indexPattern,
      remoteClustersExist,
    } = this.state;

    if (isInitiallyLoadingIndices) {
      return <LoadingState />;
    }

    const hasDataIndices = allIndices.some(({ name }) => !name.startsWith('.'));
    if (!hasDataIndices && !isIncludingSystemIndices && !remoteClustersExist) {
      return <EmptyState onRefresh={this.fetchData} />;
    }

    if (step === 1) {
      const { services, initialQuery } = this.props;
      return (
        <StepIndexPattern
          allIndices={allIndices}
          initialQuery={indexPattern || initialQuery}
          isIncludingSystemIndices={isIncludingSystemIndices}
          esService={services.es}
          savedObjectsClient={services.savedObjectsClient}
          indexPatternCreationType={this.indexPatternCreationType}
          goToNextStep={this.goToTimeFieldStep}
          uiSettings={services.uiSettings}
        />
      );
    }

    if (step === 2) {
      const { services } = this.props;
      return (
        <StepTimeField
          indexPattern={indexPattern}
          indexPatternsService={services.indexPatterns}
          goToPreviousStep={this.goToIndexPatternStep}
          createIndexPattern={this.createIndexPattern}
          indexPatternCreationType={this.indexPatternCreationType}
        />
      );
    }

    return null;
  }

  removeToast = removedToast => {
    this.setState(prevState => ({
      toasts: prevState.toasts.filter(toast => toast.id !== removedToast.id),
    }));
  };

  render() {
    const header = this.renderHeader();
    const content = this.renderContent();

    return (
      <React.Fragment>
        <div>
          {header}
          {content}
        </div>
        <EuiGlobalToastList
          toasts={this.state.toasts}
          dismissToast={this.removeToast}
          toastLifeTimeMs={6000}
        />
      </React.Fragment>
    );
  }
}
