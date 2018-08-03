import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { DomPreview } from '../dom_preview';
import { PageControls } from './page_controls';

export class PagePreview extends PureComponent {
  static propTypes = {
    page: PropTypes.object.isRequired,
    height: PropTypes.number.isRequired,
    pageNumber: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    setWidth: PropTypes.func.isRequired,
    duplicatePage: PropTypes.func.isRequired,
    confirmDelete: PropTypes.func.isRequired,
  };

  render() {
    const { page, pageNumber, height, width, setWidth, duplicatePage, confirmDelete } = this.props;

    return (
      <div
        className="canvasPageManager__pagePreview"
        style={{ width: width, backgroundColor: page.style.background }}
      >
        <div className="canvasPageManager__preview" style={{ width: width }}>
          <DomPreview
            elementId={page.id}
            pageNumber={pageNumber}
            height={height}
            setPagePreviewWidth={width => setWidth(width)}
          />
          <PageControls
            pageId={page.id}
            pageNumber={pageNumber}
            onDuplicate={duplicatePage}
            onDelete={confirmDelete}
          />
        </div>
      </div>
    );
  }
}
