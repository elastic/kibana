import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelHeader } from './panel_header';
import { PanelError } from './panel_error';

export class DashboardPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.embeddable = null;
    this.embeddableHandler = null;
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    const { getEmbeddableHandler, panel, getContainerApi } = this.props;

    this.containerApi = getContainerApi();
    this.embeddableHandler = getEmbeddableHandler(panel.type);

    if (!this.embeddableHandler) {
      /* eslint-disable react/no-did-mount-set-state */
      this.setState({ error: `Invalid panel type ${panel.type}` });
    }

    // TODO: use redux instead of the isMounted anti-pattern to handle the case when the component is unmounted
    // before the async calls above return. We can then get rid of the eslint disable line. Without redux, there is
    // not a better option, since you aren't supposed to run async calls inside of componentWillMount.

    /* eslint-disable react/no-did-mount-set-state */
    this.embeddableHandler.getEditPath(panel.id).then(editUrl => {
      if (this._isMounted) { this.setState({ editUrl }); }
    });

    /* eslint-disable react/no-did-mount-set-state */
    this.embeddableHandler.getTitleFor(panel.id).then(title => {
      if (this._isMounted) { this.setState({ title }); }
    });

    if (this._isMounted) {
      this.embeddableHandler.render(
          this.panelElement,
          panel,
          this.containerApi)
        .then(destroyEmbeddable => this.destroyEmbeddable = destroyEmbeddable)
        .catch(error => {
          const message = error.message || JSON.stringify(error);
          this.setState({ error: message });
        });
    }
  }

  isViewOnlyMode() {
    return this.props.dashboardViewMode === DashboardViewMode.VIEW || this.props.isFullScreenMode;
  }

  toggleExpandedPanel = () => this.props.onToggleExpanded(this.props.panel.panelIndex);

  deletePanel = () => {
    this.props.onDeletePanel(this.props.panel.panelIndex);
  };

  onEditPanel = () => window.location = this.state.editUrl;

  onFocus = () => {
    const { onPanelFocused } = this.props;
    if (onPanelFocused) {
      onPanelFocused(this.props.panel.panelIndex);
    }
  };

  onBlur = () => {
    const { onPanelBlurred } = this.props;
    if (onPanelBlurred) {
      onPanelBlurred(this.props.panel.panelIndex);
    }
  };

  componentWillUnmount() {
    // This is required because it's possible the component becomes unmounted before embeddableHandler.render returns.
    // This is really an anti-pattern and could be cleaned up by implementing a redux framework for dashboard state.
    // Because implementing that may be a very large change in and of itself, it will be a second step, and we'll live
    // with this anti-pattern for the time being.
    this._isMounted = false;
    if (this.destroyEmbeddable) {
      this.destroyEmbeddable();
    }
  }

  renderEmbeddedContent() {
    return (
      <div
        id="embeddedPanel"
        className="panel-content"
        ref={panelElement => this.panelElement = panelElement}
      />
    );
  }

  renderEmbeddedError() {
    return <PanelError error={this.state.error} />;
  }

  render() {
    const { title } = this.state;
    const { dashboardViewMode, isFullScreenMode, isExpanded } = this.props;
    const classes = classNames('panel panel-default', this.props.className, {
      'panel--edit-mode': !this.isViewOnlyMode()
    });
    return (
      <div
        className="dashboard-panel"
        onFocus={this.onFocus}
        onBlur={this.onBlur}
      >
        <div
          className={classes}
          data-test-subj="dashboardPanel"
        >
          <PanelHeader
            title={title}
            onDeletePanel={this.deletePanel}
            onEditPanel={this.onEditPanel}
            onToggleExpand={this.toggleExpandedPanel}
            isExpanded={isExpanded}
            isViewOnlyMode={isFullScreenMode || dashboardViewMode === DashboardViewMode.VIEW}
          />

          {this.state.error ? this.renderEmbeddedError() : this.renderEmbeddedContent()}

        </div>
      </div>
    );
  }
}

DashboardPanel.propTypes = {
  dashboardViewMode: PropTypes.oneOf([DashboardViewMode.EDIT, DashboardViewMode.VIEW]).isRequired,
  isFullScreenMode: PropTypes.bool.isRequired,
  panel: PropTypes.object.isRequired,
  getEmbeddableHandler: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  getContainerApi: PropTypes.func.isRequired,
  onToggleExpanded: PropTypes.func.isRequired,
  onDeletePanel: PropTypes.func,
  onPanelFocused: PropTypes.func,
  onPanelBlurred: PropTypes.func,
};
