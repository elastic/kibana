import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import './page_manager.less';

export const PageManager = (props) => {
  const {
    done,
    pages,
    selectedPage,
    loadPage,
    addPage,
    movePage,
    removePage,
    withControls,
    showControls,
  } = props;

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
              <div className="title">Page<br />{page.id.split('-')[1].substring(0, 6)}</div>
            </div>
            {(withControls === page.id) && (
              <div className="canvas__page-manager--page-controls">
                <span className="fa fa-angle-double-left move-left" onClick={() => movePage(page.id, -1)} />
                <span className="fa fa-trash delete" onClick={() => removePage(page.id)} />
                <span className="fa fa-angle-double-right move-right" onClick={() => movePage(page.id, 1)} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="canvas__page-manager--controls">
        <Button bsStyle="success" onClick={addPage}>Add Page</Button>
        <Button onClick={done}>Done</Button>
      </div>
    </div>
  );
};

PageManager.propTypes = {
  done: PropTypes.func.isRequired,
  pages: PropTypes.array.isRequired,
  loadPage: PropTypes.func.isRequired,
  addPage: PropTypes.func.isRequired,
  movePage: PropTypes.func.isRequired,
  removePage: PropTypes.func.isRequired,
  selectedPage: PropTypes.string,
  withControls: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  showControls: PropTypes.func,
};
