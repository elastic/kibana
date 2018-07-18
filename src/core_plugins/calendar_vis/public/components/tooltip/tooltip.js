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
import { EuiPortal, findPopoverPosition } from '@elastic/eui';
import { EuiToolTipPopover } from '@elastic/eui/lib/components/tool_tip/tool_tip_popover';
import classNames from 'classnames';
import './tooltip.less';

const positionsToClassNameMap = {
  top: 'euiToolTip--top',
  right: 'euiToolTip--right',
  bottom: 'euiToolTip--bottom',
  left: 'euiToolTip--left',
};

const defaultPosition = 'top';

export class EuiTooltip extends React.Component {
  constructor(props) {
    super(props);
    this.anchor = null;
    this.popover = null;
    const tooltipPosition = positionsToClassNameMap[defaultPosition];
    this.tooltipClass = 'calendar-tooltip euiToolTip euiToolTipPopover';
    this.state = {
      show: false,
      toolTipStyles: {
        left: -500,
        right: -500
      },
      arrowStyles: {},
      position: tooltipPosition,
      content: {
        __html: ''
      }
    };
    this._positionTooltip = this._positionTooltip.bind(this);
  }

  setPopoverRef = ref => {
    this.popover = ref;
  }

  static getDerivedStateFromProps(props) {
    const { dispatch, anchorEvent, hashTable, formatter } = props;
    if (dispatch === null) {
      throw new Error('dispatch object missing');
    }
    const { target } = anchorEvent;

    if (hashTable.get(target.id)) {
      const val = hashTable.get(target.id);
      if (anchorEvent.type === 'mouseover') {
        return {
          show: true,
          content: {
            __html: formatter(dispatch.eventResponse(val))
          }
        };
      }else if (anchorEvent.type === 'mouseout') {
        return {
          show: false
        };
      }
    }else{
      return {
        show: false
      };
    }
  }

  componentDidMount() {
    this.props.renderComplete();
  }

  componentDidUpdate() {
    this.props.renderComplete();
  }

  render() {
    if(this.state.show && this.state.content.__html !== '') {
      return (
        <EuiPortal>
          <EuiToolTipPopover
            id={this.props.id}
            className={classNames(this.tooltipClass, this.state.position)}
            style={this.state.toolTipStyles}
            positionToolTip={this._positionTooltip()}
            popoverRef={this.setPopoverRef}
            role="tooltip"
          >
            <div style={this.state.arrowStyles} className="euiToolTip__arrow" />
            <div
              /*
               * Justification for dangerousltSetInnerHTML:
               * The EuiTooltip component wraps the content from point_series tooltip
               */
              dangerouslySetInnerHTML={this.state.content} //eslint-disable-line react/no-danger
            />
          </EuiToolTipPopover>
        </EuiPortal>
      );
    }else {
      return (null);
    }
  }

  componentWillUnmount() {
    this.tooltipClass = null;
    this.anchor = null;
    this.popover = null;
  }

  _positionTooltip() {
    const anchor = this.props.anchorEvent.target;
    const self = this;

    return function () {

      const { position, left, top, arrow } = findPopoverPosition({
        anchor: anchor,
        popover: self.popover,
        position: defaultPosition,
        container: self.props.container,
        offset: 16,
        arrowConfig: {
          arrowWidth: 14,
          arrowBuffer: 4
        }
      });

      self.setState({
        toolTipStyles: {
          left: left,
          top: top
        },
        arrowStyles: arrow,
        position: positionsToClassNameMap[position]
      });
    };
  }
}
