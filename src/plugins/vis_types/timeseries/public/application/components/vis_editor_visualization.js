/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSwitch,
  EuiText,
  keys,
} from '@elastic/eui';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { BehaviorSubject } from 'rxjs';

import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-plugin/public';
import './_vis_editor_visualization.scss';
import { omit } from 'lodash';

const MIN_CHART_HEIGHT = 300;

class VisEditorVisualizationUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      height: MIN_CHART_HEIGHT,
      dragging: false,
    };

    this._parentApi = {
      timeRange$: new BehaviorSubject(props.timeRange),
      query$: new BehaviorSubject(props.query),
      filters$: new BehaviorSubject(props.filters),
    };
  }

  updateParentApi = (timeRange, query, filters) => {
    this._parentApi.timeRange$.next(timeRange);
    this._parentApi.query$.next(query);
    this._parentApi.filters$.next(filters);
  };

  getSavedVis = () => ({
    ...omit(this.props.vis, 'uiState'),
    type: this.props.vis.type.name,
  });

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

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  componentDidMount() {
    window.addEventListener('mousemove', this.handleMouseMove);
  }

  render() {
    const {
      dirty,
      autoApply,
      title,
      description,
      onToggleAutoApply,
      onCommit,
      timeRange,
      filters,
      query,
    } = this.props;
    const style = { height: this.state.height };

    this.updateParentApi(timeRange, query, filters);
    this.updateVis?.();

    if (this.state.dragging) {
      style.userSelect = 'none';
    }

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
        >
          <ReactEmbeddableRenderer
            type={VISUALIZE_EMBEDDABLE_TYPE}
            getParentApi={() => ({
              ...this._parentApi,
              getSerializedStateForChild: () => ({
                rawState: {
                  savedVis: this.getSavedVis(),
                  title,
                  description,
                },
                references: [],
              }),
            })}
            onApiAvailable={(api) => {
              this.updateVis = () => api.updateVis(this.getSavedVis());
              api.subscribeToInitialRender(() =>
                this.props.eventEmitter.emit('embeddableRendered')
              );
              api.subscribeToHasInspector((hasInspector) => {
                if (!hasInspector) return;
                const [, setOpenInspector] = this.props.embeddableApiHandler.openInspector;
                setOpenInspector(() => api.openInspector);
              });
              api.subscribeToNavigateToLens((navigateToLens) => {
                if (!navigateToLens) return;
                const [, setNavigateToLens] = this.props.embeddableApiHandler.navigateToLens;
                setNavigateToLens(() => navigateToLens);
              });
              api.subscribeToVisData((data) => {
                this.props.onDataChange(data?.value);
              });
            }}
          />
        </div>
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
            <EuiIcon type="grab" />
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
  eventEmitter: PropTypes.object,
  timeRange: PropTypes.object,
  dirty: PropTypes.bool,
  autoApply: PropTypes.bool,
};

export const VisEditorVisualization = injectI18n(VisEditorVisualizationUI);
