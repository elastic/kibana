import { set } from 'lodash';
export default function pivot(req, panel) {
  return next => doc => {
    if (panel.pivot_id) {
      set(doc, 'aggs.pivot.terms.field', panel.pivot_id);
      set(doc, 'aggs.pivot.terms.size', panel.pivot_rows);
      set(doc, 'aggs.pivot.terms.order', { _term: 'asc' });
    } else {
      set(doc, 'aggs.pivot.filter.match_all', {});
    }
    return next(doc);
  };
}
