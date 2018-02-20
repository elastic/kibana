import React from 'react';
import PropTypes from 'prop-types';

export class TagListing extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      tags: []
    };
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    // fetch tags
  }

  render() {
    return (
      <div>Tag management</div>
    );
  }
}

TagListing.propTypes = {
  find: PropTypes.func.isRequired,
  delete: PropTypes.func.isRequired,
};
