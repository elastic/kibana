import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { embeddableHandlerCache } from '../cache/embeddable_handler_cache';

export class EmbeddableViewport extends React.Component {
  constructor(props) {
    super(props);
    embeddableHandlerCache.onContainerStateChanged(props.panelId, props.containerState);
  }

  async componentDidMount() {
    embeddableHandlerCache.render(this.props.panelId, this.panelElement);
  }

  componentWillUnmount() {
    embeddableHandlerCache.destroy(this.props.panelId);
  }

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(nextProps.containerState, this.props.containerState);
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.containerState, this.props.containerState)) {
      embeddableHandlerCache.onContainerStateChanged(this.props.panelId, this.props.containerState);
    }
  }

  render() {
    return (
      <div
        id="embeddedPanel"
        className="panel-content"
        ref={panelElement => this.panelElement = panelElement}
      />
    );
  }
}

EmbeddableViewport.propTypes = {
  panelId: PropTypes.string.isRequired,
  containerState: PropTypes.shape({
    timeRange: PropTypes.object.isRequired,
    embeddablePersonalization: PropTypes.object.isRequired,
    hidePanelTitles: PropTypes.bool.isRequired,
  })
};
