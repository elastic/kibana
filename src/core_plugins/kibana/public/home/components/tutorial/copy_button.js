import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'pui-react-tooltip';
import { OverlayTrigger } from 'pui-react-overlay-trigger';
import { KuiButton } from 'ui_framework/components';
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
        <KuiButton
          buttonType="secondary"
          onClick={this.copySnippet}
          onMouseOut={this.resetTooltipText}
        >
          Copy snippet
        </KuiButton>
      </OverlayTrigger>
    );
  }
}

CopyButton.propTypes = {
  textToCopy: PropTypes.string.isRequired,
};
