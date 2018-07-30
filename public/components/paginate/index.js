import PropTypes from 'prop-types';
import { compose, withState, withProps, withHandlers, lifecycle } from 'recompose';
import { Paginate as Component } from './paginate';

export const Paginate = compose(
  withProps(({ rows, perPage }) => ({
    perPage: Number(perPage),
    totalPages: Math.ceil(rows.length / (perPage || 10)),
  })),
  withState('currentPage', 'setPage', ({ startPage, totalPages }) => {
    if (totalPages > 0) return Math.min(startPage, totalPages - 1);
    return 0;
  }),
  withProps(({ rows, totalPages, currentPage, perPage }) => {
    const maxPage = totalPages - 1;
    const start = currentPage * perPage;
    const end = currentPage === 0 ? perPage : perPage * (currentPage + 1);
    return {
      pageNumber: currentPage,
      nextPageEnabled: currentPage < maxPage,
      prevPageEnabled: currentPage > 0,
      partialRows: rows.slice(start, end),
    };
  }),
  withHandlers({
    nextPage: ({ currentPage, nextPageEnabled, setPage }) => () =>
      nextPageEnabled && setPage(currentPage + 1),
    prevPage: ({ currentPage, prevPageEnabled, setPage }) => () =>
      prevPageEnabled && setPage(currentPage - 1),
  }),
  lifecycle({
    componentDidUpdate(prevProps) {
      if (prevProps.perPage !== this.props.perPage) {
        this.props.setPage(0);
      }
    },
  })
)(Component);

Paginate.propTypes = {
  rows: PropTypes.array.isRequired,
  perPage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  startPage: PropTypes.number,
};

Paginate.defaultProps = {
  perPage: 10,
  startPage: 0,
};
