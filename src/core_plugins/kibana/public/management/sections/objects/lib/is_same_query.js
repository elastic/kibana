import { parseQuery } from '.';

export const isSameQuery = (query1, query2) => {
  const parsedQuery1 = parseQuery(query1);
  const parsedQuery2 = parseQuery(query2);

  if (parsedQuery1.queryText === parsedQuery2.queryText) {
    if (parsedQuery1.visibleTypes === parsedQuery2.visibleTypes) {
      return true;
    }
  }
  return false;
};
