import { sortBy, uniq } from 'lodash';

export async function getFields(req) {
  const { indexPatternsService } = req.pre;
  const index = req.query.index || '*';
  const resp = await indexPatternsService.getFieldsForWildcard({ pattern: index });
  const fields = resp.filter(field => field.aggregatable);
  return sortBy(uniq(fields, field => field.name), 'name');
}
