import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';
import { EuiButton } from '@elastic/eui';
import { copyToClipboard } from '../../copy_to_clipboard';

const UNCOPIED_MSG = 'Copy to clipboard';
const COPIED_MSG = 'Copied';

export class CopyButton extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      tooltipText: UNCOPIED_MSG
    };
  }

  copySnippet = () => {
    const isCopied = copyToClipboard(this.props.textToCopy);
    if (isCopied) {
      this.setState({
        tooltipText: COPIED_MSG,
      });
    }
  }

  resetTooltipText = () => {
    this.setState({
      tooltipText: UNCOPIED_MSG,
    });
  }

  render() {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip>
            {this.state.tooltipText}
          </Tooltip>
        }
      >
        <EuiButton
          size="s"
          onClick={this.copySnippet}
          onMouseOut={this.resetTooltipText}
        >
          Copy snippet
        </EuiButton>
      </OverlayTrigger>
    );
  }
}

CopyButton.propTypes = {
  textToCopy: PropTypes.string.isRequired,
};
