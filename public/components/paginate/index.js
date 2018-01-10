import PropTypes from 'prop-types';
import { compose, withState, withProps, withHandlers } from 'recompose';
import { Paginate as Component } from './paginate';

export const Paginate = compose(
  withProps(({ rows, perPage }) => ({
    perPage: Number(perPage),
    totalPages: Math.ceil(rows.length / (perPage || 10)),
  })),
  withState('currentPage', 'setPage', ({ startPage, totalPages }) => {
    const maxPage = totalPages - 1;
    if (startPage && startPage > maxPage) return maxPage;
    if (startPage) return startPage;
    return 0;
  }),
  withProps(({ rows, totalPages, currentPage, perPage }) => {
    const start = currentPage * perPage;
    const end = currentPage === 0 ? perPage : perPage * (currentPage + 1);
    return {
      pageNumber: currentPage + 1,
      nextPageEnabled: currentPage < totalPages - 1,
      prevPageEnabled: currentPage > 0,
      partialRows: rows.slice(start, end),
    };
  }),
  withHandlers({
    nextPage: ({ currentPage, nextPageEnabled, setPage }) => () =>
      nextPageEnabled && setPage(currentPage + 1),
    prevPage: ({ currentPage, prevPageEnabled, setPage }) => () =>
      prevPageEnabled && setPage(currentPage - 1),
  })
)(Component);

Paginate.propTypes = {
  rows: PropTypes.array.isRequired,
  perPage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  startPage: PropTypes.number,
};
