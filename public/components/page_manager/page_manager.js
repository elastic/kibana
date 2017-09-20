import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { PageControls } from './page_controls';
import { ConfirmModal } from '../confirm_modal';
import { RemoveIcon } from '../remove_icon';
import './page_manager.less';


export const PageManager = (props) => {
  const {
    done,
    pages,
    selectedPage,
    loadPage,
    addPage,
    movePage,
    duplicatePage,
    removePage,
    deleteId,
    setDeleteId,
  } = props;

  const confirmDelete = (pageId) => setDeleteId(pageId);
  const resetDelete = () => setDeleteId(null);
  const doDelete = () => {
    resetDelete();
    removePage(deleteId);
  };

  return (
    <div className="canvas__page-manager">
      <div className="canvas__page-manager--pages">
        {pages.map((page, i) => (
          <div
            key={page.id}
            className={`canvas__page-manager--page ${page.id === selectedPage ? 'active' : ''}`}
            onClick={() => loadPage(page.id)}
          >
            <RemoveIcon
              className="canvas__page-manager--page-remove"
              onClick={() => confirmDelete(page.id)}/>
            <div className="canvas__page-manager--page-index">
              { i + 1 }
            </div>
            <PageControls
              pageId={page.id}
              movePage={movePage}
              duplicatePage={duplicatePage}/>
          </div>
        ))}
        <div
          className="canvas__page-manager--page"
          onClick={addPage}
        >
          <div className="canvas__page-manager--page-index">
            +
          </div>
        </div>
      </div>
      <div className="canvas__page-manager--controls">
        <Button onClick={done}>Done</Button>
      </div>

      <ConfirmModal
        isOpen={deleteId != null}
        message={'Are you sure you want to remove this page?'}
        confirmButtonText="Remove"
        onConfirm={doDelete}
        onCancel={resetDelete}
      />
    </div>
  );
};

PageManager.propTypes = {
  done: PropTypes.func.isRequired,
  pages: PropTypes.array.isRequired,
  loadPage: PropTypes.func.isRequired,
  addPage: PropTypes.func.isRequired,
  movePage: PropTypes.func.isRequired,
  duplicatePage: PropTypes.func.isRequired,
  removePage: PropTypes.func.isRequired,
  selectedPage: PropTypes.string,
  deleteId: PropTypes.string,
  setDeleteId: PropTypes.func.isRequired,
};
