import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { StepIndexPattern } from './components/step_index_pattern';
import { StepTimeField } from './components/step_time_field';
import { Header } from './components/header';
import { LoadingState } from './components/loading_state';
import { EmptyState } from './components/empty_state';

import { MAX_SEARCH_SIZE } from './constants';
import { getIndices } from './lib/get_indices';

export class CreateIndexPatternWizard extends Component {
  static propTypes = {
    loadingDataDocUrl: PropTypes.string.isRequired,
    initialQuery: PropTypes.string,
    services: PropTypes.shape({
      es: PropTypes.object.isRequired,
      indexPatterns: PropTypes.object.isRequired,
      savedObjectsClient: PropTypes.object.isRequired,
      config: PropTypes.object.isRequired,
      kbnUrl: PropTypes.object.isRequired,
    }).isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      step: 1,
      indexPattern: '',
      allIndices: [],
      isInitiallyLoadingIndices: true,
      isIncludingSystemIndices: false,
    };
  }

  async componentWillMount() {
    const { services } = this.props;
    const allIndices = await getIndices(services.es, `*`, MAX_SEARCH_SIZE);
    this.setState({ allIndices, isInitiallyLoadingIndices: false });
  }

  createIndexPattern = async (timeFieldName, indexPatternId) => {
    const { services } = this.props;
    const { indexPattern } = this.state;

    const emptyPattern = await services.indexPatterns.get();

    Object.assign(emptyPattern, {
      id: indexPatternId,
      title: indexPattern,
      timeFieldName,
    });

    const createdId = await emptyPattern.create();

    if (!services.config.get('defaultIndex')) {
      services.config.set('defaultIndex', createdId);
    }

    services.indexPatterns.cache.clear(createdId);
    services.kbnUrl.change(`/management/kibana/indices/${createdId}`);
  }

  goToTimeFieldStep = (indexPattern) => {
    this.setState({ step: 2, indexPattern });
  }

  goToIndexPatternStep = () => {
    this.setState({ step: 1 });
  }

  onChangeIncludingSystemIndices = () => {
    this.setState(state => ({
      isIncludingSystemIndices: !state.isIncludingSystemIndices,
    }));
  }

  renderHeader() {
    const { isIncludingSystemIndices } = this.state;

    return (
      <Header
        isIncludingSystemIndices={isIncludingSystemIndices}
        onChangeIncludingSystemIndices={this.onChangeIncludingSystemIndices}
      />
    );
  }

  renderInitialLoadingState() {
    const { isInitiallyLoadingIndices } = this.state;

    if (!isInitiallyLoadingIndices) {
      return null;
    }

    return (
      <LoadingState/>
    );
  }

  renderInitialEmptyState() {
    const { allIndices, isInitiallyLoadingIndices } = this.state;
    const { loadingDataDocUrl } = this.props;

    if (allIndices.length > 0 || isInitiallyLoadingIndices) {
      return null;
    }

    return (
      <EmptyState loadingDataDocUrl={loadingDataDocUrl}/>
    );
  }

  renderStepOne() {
    const {
      allIndices,
      isInitiallyLoadingIndices,
      isIncludingSystemIndices,
      step,
      indexPattern,
    } = this.state;

    if (isInitiallyLoadingIndices || step !== 1) {
      return null;
    }

    const { services, initialQuery } = this.props;

    return (
      <StepIndexPattern
        allIndices={allIndices}
        initialQuery={indexPattern || initialQuery}
        isIncludingSystemIndices={isIncludingSystemIndices}
        esService={services.es}
        savedObjectsClient={services.savedObjectsClient}
        goToNextStep={this.goToTimeFieldStep}
      />
    );
  }

  renderStepTwo() {
    const { step, indexPattern } = this.state;
    const { services } = this.props;

    if (step !== 2) {
      return null;
    }

    return (
      <StepTimeField
        indexPattern={indexPattern}
        indexPatternsService={services.indexPatterns}
        goToPreviousStep={this.goToIndexPatternStep}
        createIndexPattern={this.createIndexPattern}
      />
    );
  }

  render() {
    return (
      <div>
        {this.renderHeader()}
        {this.renderInitialLoadingState()}
        {this.renderInitialEmptyState()}
        {this.renderStepOne()}
        {this.renderStepTwo()}
      </div>
    );
  }
}


