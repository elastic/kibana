import React from 'react';
import PropTypes from 'prop-types';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';

export class WorkpadExport extends React.PureComponent {
  static propTypes = {
    workpad: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
    }).isRequired,
    pageCount: PropTypes.number.isRequired,
    enabled: PropTypes.bool.isRequired,
    onExport: PropTypes.func.isRequired,
  };

  exportPdf = () => {
    const { workpad, pageCount, onExport } = this.props;

    const options = {
      pageCount,
    };

    onExport('pdf', workpad, options);
  };

  render() {
    // don't show control if it's not enabled
    if (!this.props.enabled) return null;

    return (
      <EuiToolTip position="bottom" content="Create PDF of Workpad">
        <EuiButtonIcon iconType="exportAction" aria-label="Create PDF" onClick={this.exportPdf} />
      </EuiToolTip>
    );
  }
}
