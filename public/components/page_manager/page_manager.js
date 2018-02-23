import React from 'react';
import PropTypes from 'prop-types';
import { ConfirmModal } from '../confirm_modal';
import { RemoveIcon } from '../remove_icon';
import { Link } from '../link';
import { PageControls } from './page_controls';
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

  confirmDelete = pageId => () => this.props.setDeleteId(pageId);

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
        <div className={`canvas__page-manager--page ${page.id === selectedPage ? 'active' : ''}`}>
          <RemoveIcon
            className="canvas__page-manager--page-remove"
            onClick={this.confirmDelete(page.id)}
          />
          <div className="canvas__page-manager--page-index">{pageNumber}</div>
          <PageControls pageId={page.id} movePage={movePage} duplicatePage={duplicatePage} />
        </div>
      </Link>
    );
  };

  render() {
    const { pages, addPage, deleteId } = this.props;

    return (
      <div className="canvas__page-manager">
        <div className="canvas__page-manager--pages">
          {pages.map(this.renderPage)}
          <div className="canvas__page-manager--page" onClick={addPage}>
            <div className="canvas__page-manager--page-index">+</div>
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
