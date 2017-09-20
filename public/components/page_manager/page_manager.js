import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { PageControls } from './page_controls';
import { ConfirmModal } from '../confirm_modal';
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
    withControls,
    showControls,
    deleteId,
    setDeleteId,
  } = props;

  const confirmDelete = (pageId) => setDeleteId(pageId);
  const resetDelete = () => setDeleteId(null);
  const doDelete = () => {
    resetDelete();
    removePage(deleteId);
  };

  const pageName = page => page.id.split('-')[1].substring(0, 6);

  return (
    <div className="canvas__page-manager">
      <div className="canvas__page-manager--pages">
        {pages.map(page => (
          <div
            key={page.id}
            className="canvas__page-manager--page"
            onMouseEnter={() => showControls(page.id)}
            onMouseLeave={() => showControls(false)}
          >
            <div
              className={`body ${page.id === selectedPage ? 'selected' : ''}`}
              onClick={() => loadPage(page.id)}
            >
              <div className="title">Page<br />{pageName(page)}</div>
            </div>
            {(withControls === page.id) && (
              <PageControls
                pageId={page.id}
                movePage={movePage}
                duplicatePage={duplicatePage}
                removePage={confirmDelete}
              />
            )}
          </div>
        ))}
      </div>
      <div className="canvas__page-manager--controls">
        <Button bsStyle="success" onClick={addPage}>Add Page</Button>
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
  withControls: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  showControls: PropTypes.func,
  deleteId: PropTypes.string,
  setDeleteId: PropTypes.func.isRequired,
};
