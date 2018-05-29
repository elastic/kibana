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

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiToolTip,
} from '@elastic/eui';
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
      <EuiToolTip
        content={this.state.tooltipText}
      >
        <EuiButton
          size="s"
          onClick={this.copySnippet}
          onMouseOut={this.resetTooltipText}
        >
          Copy snippet
        </EuiButton>
      </EuiToolTip>
    );
  }
}

CopyButton.propTypes = {
  textToCopy: PropTypes.string.isRequired,
};
