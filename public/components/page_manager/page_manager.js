import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { PagePreview } from '../page_preview';
import { PageControls } from './page_controls';

export class PageManager extends React.PureComponent {
  static propTypes = {
    pages: PropTypes.array.isRequired,
    workpadId: PropTypes.string.isRequired,
    addPage: PropTypes.func.isRequired,
    movePage: PropTypes.func.isRequired,
    duplicatePage: PropTypes.func.isRequired,
    removePage: PropTypes.func.isRequired,
    selectedPage: PropTypes.string,
    deleteId: PropTypes.string,
    setDeleteId: PropTypes.func.isRequired,
  };

  confirmDelete = pageId => {
    this.props.setDeleteId(pageId);
  };

  resetDelete = () => this.props.setDeleteId(null);

  doDelete = () => {
    this.resetDelete();
    this.props.removePage(this.props.deleteId);
  };

  renderPage = (page, i) => {
    const { selectedPage, workpadId, movePage, duplicatePage } = this.props;
    const pageNumber = i + 1;

    return (
      <EuiFlexItem
        key={page.id}
        grow={false}
        className={`canvasPageManager__page ${
          page.id === selectedPage ? 'canvasPageManager__page-isActive' : ''
        }`}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" className="canvasPageManager__pageNumber">
              {pageNumber}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Link
              name="loadWorkpad"
              params={{ id: workpadId, page: pageNumber }}
              aria-label={`Load page number ${pageNumber}`}
            >
              <PagePreview
                page={page}
                height={94}
                pageNumber={pageNumber}
                movePage={movePage}
                selectedPage={selectedPage}
              />
            </Link>
            <PageControls
              pageId={page.id}
              pageNumber={pageNumber}
              movePage={movePage}
              onDuplicate={duplicatePage}
              onDelete={this.confirmDelete}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  render() {
    const { pages, addPage, deleteId } = this.props;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="none" className="canvasPageManager">
          <EuiFlexItem className="canvasPageManager__pages">
            <div className="canvasPageManager__pageScroll">
              <EuiFlexGroup gutterSize="none" className="canvasPageManager__pageList">
                {pages.map(this.renderPage)}
              </EuiFlexGroup>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              anchorClassName="canvasPageManager__addPageTip"
              content="Add a new page to this workpad"
              position="left"
            >
              <button onClick={addPage} className="canvasPageManager__addPage">
                <EuiIcon color="ghost" type="plusInCircle" size="l" />
              </button>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <ConfirmModal
          isOpen={deleteId != null}
          title="Remove Page"
          message="Are you sure you want to remove this page?"
          confirmButtonText="Remove"
          onConfirm={this.doDelete}
          onCancel={this.resetDelete}
        />
      </Fragment>
    );
  }
}
