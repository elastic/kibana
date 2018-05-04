import React from 'react';
import PropTypes from 'prop-types';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { PagePreview } from '../page_preview';
import './page_manager.less';

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
      <Link
        key={page.id}
        name="loadWorkpad"
        params={{ id: workpadId, page: pageNumber }}
        aria-label={`Load page number ${pageNumber}`}
      >
        <PagePreview
          page={page}
          height={94}
          pageNumber={pageNumber}
          movePage={movePage}
          duplicatePage={duplicatePage}
          selectedPage={selectedPage}
          confirmDelete={this.confirmDelete}
        />
      </Link>
    );
  };

  render() {
    const { pages, addPage, deleteId } = this.props;

    return (
      <div className="canvas__page-manager">
        <div className="canvas__page-manager--pages">
          {pages.map(this.renderPage)}
          <div className="canvas__page-manager--page-add" onClick={addPage}>
            <i className="fa fa-plus-circle" />
          </div>
        </div>

        <ConfirmModal
          isOpen={deleteId != null}
          title="Remove Page"
          message="Are you sure you want to remove this page?"
          confirmButtonText="Remove"
          onConfirm={this.doDelete}
          onCancel={this.resetDelete}
        />
      </div>
    );
  }
}
