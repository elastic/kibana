import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiCard,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
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
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={this.state.isProcessingRequest}
              onClick={this.startRequest}
              color="danger"
            >
              {this.state.isProcessingRequest ? 'Removing' : 'Remove'}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              href={this.props.launchUrl}
            >
              Launch
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={this.state.isProcessingRequest}
            onClick={this.startRequest}
          >
            {this.state.isProcessingRequest ? 'Adding' : 'Add'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    return (
      <EuiCard
        image={this.props.previewUrl}
        title={this.props.name}
        description={this.props.description}
        betaBadgeLabel={this.props.isInstalled ? 'INSTALLED' : null}
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
  previewUrl: PropTypes.string.isRequired,
};
