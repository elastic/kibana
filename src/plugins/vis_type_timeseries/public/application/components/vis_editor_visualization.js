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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { get } from 'lodash';
import { keys, EuiFlexGroup, EuiFlexItem, EuiButton, EuiText, EuiSwitch } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import {
  getInterval,
  convertIntervalIntoUnit,
  isAutoInterval,
  isGteInterval,
  AUTO_INTERVAL,
} from './lib/get_interval';
import { PANEL_TYPES } from '../../../../../plugins/vis_type_timeseries/common/panel_types';

const MIN_CHART_HEIGHT = 300;

class VisEditorVisualizationUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      height: MIN_CHART_HEIGHT,
      dragging: false,
      panelInterval: 0,
    };

    this._visEl = React.createRef();
    this._subscription = null;
  }

  handleMouseDown = () => {
    window.addEventListener('mouseup', this.handleMouseUp);
    this.setState({ dragging: true });
  };

  handleMouseUp = () => {
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.setState({ dragging: false });
  };

  handleMouseMove = (event) => {
    if (this.state.dragging) {
      this.setState((prevState) => ({
        height: Math.max(MIN_CHART_HEIGHT, prevState.height + event.movementY),
      }));
    }
  };

  async _loadVisualization() {
    if (!this._visEl.current) {
      // In case the visualize loader isn't done before the component is unmounted.
      return;
    }

    const { onDataChange, embeddableHandler } = this.props;

    this._handler = embeddableHandler;
    await this._handler.render(this._visEl.current);
    this.props.eventEmitter.emit('embeddableRendered');

    this._subscription = this._handler.handler.data$.subscribe((data) => {
      this.setPanelInterval(data.value.visData);
      onDataChange(data.value);
    });
  }

  setPanelInterval(visData) {
    const panelInterval = getInterval(visData, this.props.model);

    if (this.state.panelInterval !== panelInterval) {
      this.setState({ panelInterval });
    }
  }

  /**
   * Resize the chart height when pressing up/down while the drag handle
   * for resizing has the focus.
   * We use 15px steps to do the scaling and make sure the chart has at least its
   * defined minimum width (MIN_CHART_HEIGHT).
   */
  onSizeHandleKeyDown = (ev) => {
    const { key } = ev;
    if (key === keys.ARROW_UP || key === keys.ARROW_DOWN) {
      ev.preventDefault();
      this.setState((prevState) => {
        const newHeight = prevState.height + (key === keys.ARROW_UP ? -15 : 15);
        return {
          height: Math.max(MIN_CHART_HEIGHT, newHeight),
        };
      });
    }
  };

  hasShowPanelIntervalValue() {
    const type = get(this.props, 'model.type', '');
    const interval = get(this.props, 'model.interval', AUTO_INTERVAL);

    return (
      [
        PANEL_TYPES.METRIC,
        PANEL_TYPES.TOP_N,
        PANEL_TYPES.GAUGE,
        PANEL_TYPES.MARKDOWN,
        PANEL_TYPES.TABLE,
      ].includes(type) &&
      (isAutoInterval(interval) || isGteInterval(interval))
    );
  }

  getFormattedPanelInterval() {
    const interval = convertIntervalIntoUnit(this.state.panelInterval, false);

    return interval ? `${interval.unitValue}${interval.unitString}` : null;
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    if (this._handler) {
      this._handler.destroy();
    }
    if (this._subscription) {
      this._subscription.unsubscribe();
    }
  }

  componentDidMount() {
    window.addEventListener('mousemove', this.handleMouseMove);
    this._loadVisualization();
  }

  componentDidUpdate() {
    if (this._handler) {
      this._handler.updateInput({
        timeRange: this.props.timeRange,
        filters: this.props.filters || [],
        query: this.props.query,
      });
    }
  }

  render() {
    const { dirty, autoApply, title, description, onToggleAutoApply, onCommit } = this.props;
    const style = { height: this.state.height };

    if (this.state.dragging) {
      style.userSelect = 'none';
    }

    const panelInterval = this.hasShowPanelIntervalValue() && this.getFormattedPanelInterval();

    let applyMessage = (
      <FormattedMessage
        id="visTypeTimeseries.visEditorVisualization.changesSuccessfullyAppliedMessage"
        defaultMessage="The latest changes have been applied."
      />
    );
    if (dirty) {
      applyMessage = (
        <FormattedMessage
          id="visTypeTimeseries.visEditorVisualization.changesHaveNotBeenAppliedMessage"
          defaultMessage="The changes to this visualization have not been applied."
        />
      );
    }
    if (autoApply) {
      applyMessage = (
        <FormattedMessage
          id="visTypeTimeseries.visEditorVisualization.changesWillBeAutomaticallyAppliedMessage"
          defaultMessage="The changes will be automatically applied."
        />
      );
    }
    const applyButton = (
      <EuiFlexGroup className="tvbEditorVisualization__apply" alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiSwitch
            id="tsvbAutoApplyInput"
            label={
              <FormattedMessage
                id="visTypeTimeseries.visEditorVisualization.autoApplyLabel"
                defaultMessage="Auto apply"
              />
            }
            checked={autoApply}
            onChange={onToggleAutoApply}
          />
        </EuiFlexItem>

        {panelInterval && (
          <EuiFlexItem grow={false}>
            <EuiText color="default" size="xs">
              <p>
                <FormattedMessage
                  id="visTypeTimeseries.visEditorVisualization.panelInterval"
                  defaultMessage="Interval: {panelInterval}"
                  values={{ panelInterval }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiText color={dirty ? 'default' : 'subdued'} size="xs">
            <p>{applyMessage}</p>
          </EuiText>
        </EuiFlexItem>

        {!autoApply && (
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="play"
              fill
              size="s"
              onClick={onCommit}
              disabled={!dirty}
              data-test-subj="applyBtn"
            >
              <FormattedMessage
                id="visTypeTimeseries.visEditorVisualization.applyChangesLabel"
                defaultMessage="Apply changes"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );

    return (
      <div>
        <div
          style={style}
          className="tvbEditorVisualization"
          data-shared-items-container
          data-title={title}
          data-description={description}
          ref={this._visEl}
        />
        <div className="tvbEditor--hideForReporting">
          {applyButton}
          <button
            className="tvbEditorVisualization__draghandle"
            onMouseDown={this.handleMouseDown}
            onMouseUp={this.handleMouseUp}
            onKeyDown={this.onSizeHandleKeyDown}
            aria-label={this.props.intl.formatMessage({
              id: 'visTypeTimeseries.colorRules.adjustChartSizeAriaLabel',
              defaultMessage: 'Press up/down to adjust the chart size',
            })}
          >
            <i className="fa fa-ellipsis-h" />
          </button>
        </div>
      </div>
    );
  }
}

VisEditorVisualizationUI.propTypes = {
  model: PropTypes.object,
  onCommit: PropTypes.func,
  uiState: PropTypes.object,
  onToggleAutoApply: PropTypes.func,
  embeddableHandler: PropTypes.object,
  eventEmitter: PropTypes.object,
  timeRange: PropTypes.object,
  dirty: PropTypes.bool,
  autoApply: PropTypes.bool,
};

export const VisEditorVisualization = injectI18n(VisEditorVisualizationUI);
