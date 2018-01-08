import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiSwitch,
  EuiPanel,
  EuiIcon,
  EuiLink,
  EuiButton,
} from '@elastic/eui';
import { documentationLinks } from 'ui/documentation_links';

import { StepIndexPattern } from './components/step_index_pattern';
import { StepTimeField } from './components/step_time_field/step_time_field';

import { MAX_SEARCH_SIZE } from './constants';
import { getIndices } from './lib/get_indices';


import uiRoutes from 'ui/routes';
import angularTemplate from './angular_template.html';
import 'ui/index_patterns';

class CreateIndexPatternWizard extends Component {
  static propTypes = {
    loadingDataDocUrl: PropTypes.string.isRequired,
    services: PropTypes.shape({
      es: PropTypes.object.isRequired,
      indexPatterns: PropTypes.object.isRequired,
      config: PropTypes.object.isRequired,
      kbnUrl: PropTypes.object.isRequired,
      notify: PropTypes.object.isRequired,
    }).isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      step: 1,
      indexPattern: '',
      initialIndices: [],
      isInitiallyLoadingIndices: true,
      isIncludingSystemIndices: false,
    };
  }

  async componentWillMount() {
    const { services } = this.props;
    const initialIndices = await getIndices(services.es, `*`, MAX_SEARCH_SIZE);
    this.setState({ initialIndices, isInitiallyLoadingIndices: false });
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
      <div>
        <EuiSpacer size="m"/>
        <EuiTitle>
          <h1>Create index pattern</h1>
        </EuiTitle>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <EuiTextColor color="subdued">
                  Kibana uses index patterns to retrieve data from Elasticsearch indices for things like visualizations.
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Include system indices"
              checked={isIncludingSystemIndices}
              onChange={this.onChangeIncludingSystemIndices}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m"/>
      </div>
    );
  }

  renderInitialLoadingState() {
    const { isInitiallyLoadingIndices } = this.state;

    if (!isInitiallyLoadingIndices) {
      return null;
    }

    return (
      <EuiPanel paddingSize="l">
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <EuiTextColor color="subdued">
                <h2 style={{ textAlign: 'center' }}>Checking for Elasticsearch data</h2>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="s"/>
            <EuiText size="s">
              <p style={{ textAlign: 'center' }}>
                <EuiIcon type="faceSad"/>
                <EuiTextColor color="subdued">
                  Reticulating splines...
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  renderInitialEmptyState() {
    const { initialIndices, isInitiallyLoadingIndices } = this.state;
    const { loadingDataDocUrl } = this.props;

    if (initialIndices.length > 0 || isInitiallyLoadingIndices) {
      return null;
    }

    return (
      <EuiPanel paddingSize="l">
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <EuiTextColor color="subdued">
                <h2 style={{ textAlign: 'center' }}>Couldn&apos;t find any Elasticsearch data</h2>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="s"/>
            <EuiText>
              <p>
                <EuiTextColor color="subdued">
                  You&apos;ll need to index some data into Elasticsearch before you can create an index pattern.
                </EuiTextColor>
                &nbsp;
                <EuiLink
                  href={loadingDataDocUrl}
                  target="_blank"
                >
                  Learn how.
                </EuiLink>
              </p>
            </EuiText>
            <EuiSpacer size="xs"/>
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton iconType="faceHappy">
                  Check for new data
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  renderStepOne() {
    const {
      initialIndices,
      isInitiallyLoadingIndices,
      isIncludingSystemIndices,
      step,
    } = this.state;

    if (isInitiallyLoadingIndices || step !== 1) {
      return null;
    }

    const { services, initialQuery } = this.props;

    return (
      <StepIndexPattern
        initialIndices={initialIndices}
        initialQuery={initialQuery}
        isIncludingSystemIndices={isIncludingSystemIndices}
        esService={services.es}
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

uiRoutes.when('/management/kibana/index', {
  template: angularTemplate,
  controller: function ($scope, $injector) {
    // Wait for the directives to execute
    $scope.$$postDigest(() => {
      const Notifier = $injector.get('Notifier');
      const $routeParams = $injector.get('$routeParams');
      const services = {
        config: $injector.get('config'),
        es: $injector.get('es'),
        indexPatterns: $injector.get('indexPatterns'),
        kbnUrl: $injector.get('kbnUrl'),
        notify: new Notifier(),
      };

      const initialQuery = $routeParams.id ? decodeURIComponent($routeParams.id) : undefined;

      render(
        <CreateIndexPatternWizard
          loadingDataDocUrl={documentationLinks.indexPatterns.loadingData}
          initialQuery={initialQuery}
          services={services}
        />,
        document.getElementById('react')
      );
    });
  }
});
