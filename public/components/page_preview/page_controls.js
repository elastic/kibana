import React from 'react';
import PropTypes from 'prop-types';

export class PageControls extends React.PureComponent {
  static propTypes = {
    pageId: PropTypes.string.isRequired,
    pageNumber: PropTypes.number.isRequired,
    duplicatePage: PropTypes.func.isRequired,
    movePage: PropTypes.func.isRequired,
  };

  duplicatePage = pageId => ev => {
    ev.preventDefault();
    this.props.duplicatePage(pageId);
  };

  movePage = (pageId, position) => ev => {
    ev.preventDefault();
    this.props.movePage(pageId, position);
  };

  render() {
    const { pageId, pageNumber } = this.props;

    return (
      <div className="canvas__page-manager--page-controls">
        {`${pageNumber}`}
        <br />
        <span
          className="fa fa-angle-double-left canvas__page-manager--page-move"
          onClick={this.movePage(pageId, -1)}
        />
        <span className="fa fa-files-o" onClick={this.duplicatePage(pageId)} />
        <span
          className="fa fa-angle-double-right canvas__page-manager--page-move"
          onClick={this.movePage(pageId, +1)}
        />
      </div>
    );
  }
}
