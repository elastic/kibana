import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

export class EmbeddableViewport extends React.Component {
  constructor(props) {
    super(props);
    this.mounted = false;
  }

  async componentDidMount() {
    this.mounted = true;
    const {
      initialized,
      embeddableFactory,
      embeddableIsInitializing,
      panel,
      embeddableStateChanged,
      embeddableIsInitialized,
      embeddableError,
    } = this.props;

    if (!initialized) {
      embeddableIsInitializing();
      embeddableFactory.create(panel, embeddableStateChanged)
        .then((embeddable) => {
          if (this.mounted) {
            this.embeddable = embeddable;
            embeddableIsInitialized(embeddable.metadata);
            this.embeddable.onContainerStateChanged(this.props.containerState);
            this.embeddable.render(this.panelElement);
          } else {
            embeddable.destroy();
          }
        })
        .catch((error) => {
          if (this.mounted) {
            embeddableError(error.message);
          }
        });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.embeddable) {
      this.embeddable.destroy();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.embeddable && !_.isEqual(prevProps.containerState, this.props.containerState)) {
      this.embeddable.onContainerStateChanged(this.props.containerState);
    }
  }

  render() {
    return (
      <div
        id="embeddedPanel"
        className="panel-content"
        ref={panelElement => this.panelElement = panelElement}
      >
        {!this.props.initialized && 'loading...'}
      </div>
    );
  }
}

EmbeddableViewport.propTypes = {
  containerState: PropTypes.shape({
    timeRange: PropTypes.object.isRequired,
    embeddablePersonalization: PropTypes.object.isRequired,
    hidePanelTitles: PropTypes.bool.isRequired,
  }),
  embeddableFactory: PropTypes.shape({
    create: PropTypes.func,
  }).isRequired,
  embeddableStateChanged: PropTypes.func.isRequired,
  embeddableIsInitialized: PropTypes.func.isRequired,
  embeddableError: PropTypes.func.isRequired,
  embeddableIsInitializing: PropTypes.func.isRequired,
  initialized: PropTypes.bool.isRequired,
  panel: PropTypes.shape({
    id: PropTypes.string,
  }).isRequired,
};
