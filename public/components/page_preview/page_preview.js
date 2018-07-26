import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { DomPreview } from '../dom_preview';

export class PagePreview extends PureComponent {
  static propTypes = {
    page: PropTypes.object.isRequired,
    height: PropTypes.number.isRequired,
    pageNumber: PropTypes.number.isRequired,
    width: PropTypes.number,
    setWidth: PropTypes.func,
  };

  render() {
    const { page, pageNumber, height, width, setWidth } = this.props;

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
        </div>
      </div>
    );
  }
}
