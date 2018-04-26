import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { ensureMinimumTime } from './lib';
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
      changeUrl: PropTypes.func.isRequired,
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
    this.fetchIndices();
  }

  fetchIndices = async () => {
    this.setState({ allIndices: [], isInitiallyLoadingIndices: true });
    const { services } = this.props;
    const allIndices = await ensureMinimumTime(getIndices(services.es, `*`, MAX_SEARCH_SIZE));
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
      await services.config.set('defaultIndex', createdId);
    }

    services.indexPatterns.cache.clear(createdId);
    services.changeUrl(`/management/kibana/indices/${createdId}`);
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

  renderContent() {
    const {
      allIndices,
      isInitiallyLoadingIndices,
      isIncludingSystemIndices,
      step,
      indexPattern,
    } = this.state;

    if (isInitiallyLoadingIndices) {
      return <LoadingState />;
    }

    if (allIndices.length === 0) {
      const { loadingDataDocUrl } = this.props;
      return <EmptyState loadingDataDocUrl={loadingDataDocUrl} onRefresh={this.fetchIndices} />;
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
          goToNextStep={this.goToTimeFieldStep}
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
        />
      );
    }

    return null;
  }

  render() {
    const header = this.renderHeader();
    const content = this.renderContent();

    return (
      <div>
        {header}
        {content}
      </div>
    );
  }
}


