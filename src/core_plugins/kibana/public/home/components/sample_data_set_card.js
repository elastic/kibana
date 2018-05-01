import React, { Fragment }  from 'react';
import PropTypes from 'prop-types';
import {
  EuiCard,
  EuiButton,
} from '@elastic/eui';

import {
  installSampleDataSet,
  uninstallSampleDataSet
} from '../sample_data_sets';

export class SampleDataSetCard extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isProcessingRequest: false,
    };
  }

  startRequest = async () => {
    const {
      getConfig,
      setConfig,
      id,
      name,
      isInstalled,
      onRequestComplete,
      defaultIndex,
      clearIndexPatternsCache,
    } = this.props;

    this.setState({
      isProcessingRequest: true,
    });

    if (isInstalled) {
      await uninstallSampleDataSet(id, name, defaultIndex, getConfig, setConfig, clearIndexPatternsCache);
    } else {
      await installSampleDataSet(id, name, defaultIndex, getConfig, setConfig, clearIndexPatternsCache);
    }

    onRequestComplete();

    this.setState({
      isProcessingRequest: false,
    });
  }

  renderBtn = () => {
    if (this.props.isInstalled) {
      return (
        <Fragment>
          <EuiButton
            href={this.props.launchUrl}
          >
            Launch
          </EuiButton>
          <EuiButton
            isLoading={this.state.isProcessingRequest}
            onClick={this.startRequest}
            color="warning"
          >
            {this.state.isProcessingRequest ? 'Uninstalling' : 'Uninstall'}
          </EuiButton>
        </Fragment>
      );
    }

    return (
      <EuiButton
        isLoading={this.state.isProcessingRequest}
        onClick={this.startRequest}
      >
        {this.state.isProcessingRequest ? 'Installing' : 'Install'}
      </EuiButton>
    );
  }

  render() {
    return (
      <EuiCard
        title={this.props.name}
        description={this.props.description}
        footer={this.renderBtn()}
      />
    );
  }
}

SampleDataSetCard.propTypes = {
  id: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  launchUrl: PropTypes.string.isRequired,
  isInstalled: PropTypes.bool.isRequired,
  onRequestComplete: PropTypes.func.isRequired,
  getConfig: PropTypes.func.isRequired,
  setConfig: PropTypes.func.isRequired,
  clearIndexPatternsCache: PropTypes.func.isRequired,
  defaultIndex: PropTypes.string.isRequired,
};
