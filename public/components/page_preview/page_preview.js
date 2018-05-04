import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { DomPreview } from '../dom_preview';
import { RemoveIcon } from '../remove_icon';
import { PageControls } from './page_controls';

export class PagePreview extends PureComponent {
  static propTypes = {
    page: PropTypes.object.isRequired,
    height: PropTypes.number.isRequired,
    pageNumber: PropTypes.number.isRequired,
    movePage: PropTypes.func,
    duplicatePage: PropTypes.func,
    selectedPage: PropTypes.string,
    confirmDelete: PropTypes.func,
    width: PropTypes.number,
    setWidth: PropTypes.func,
  };

  confirmDelete = pageId => ev => {
    ev.preventDefault();
    this.props.confirmDelete(pageId);
  };

  render() {
    const {
      page,
      pageNumber,
      height,
      selectedPage,
      movePage,
      duplicatePage,
      width,
      setWidth,
    } = this.props;

    return (
      <div
        className={`canvas__page-manager--page ${page.id === selectedPage ? 'active' : ''}`}
        style={{ width: width, backgroundColor: page.style.background }}
      >
        <div className="canvas__page-manager--page-index" style={{ width: width }}>
          <DomPreview
            elementId={page.id}
            pageNumber={pageNumber}
            height={height}
            setPagePreviewWidth={width => setWidth(width)}
          />
        </div>
        <RemoveIcon
          className="canvas__page-manager--page-remove"
          onClick={this.confirmDelete(page.id)}
        />
        <PageControls
          pageId={page.id}
          pageNumber={pageNumber}
          movePage={movePage}
          duplicatePage={duplicatePage}
        />
      </div>
    );
  }
}
