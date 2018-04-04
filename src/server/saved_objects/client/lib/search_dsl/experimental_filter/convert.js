import { parseAndValidateFromApi } from './parse_and_validate_from_api';

function getExpandedFields(savedObjectTypes, rootAttributes, field) {
  if (rootAttributes.includes(field)) {
    return [field];
  }

  return savedObjectTypes.reduce((acc, t) => [
    ...acc,
    `${t}.${field}`
  ], []);
}

export function convertFilterToEsDsl(savedObjectTypes, rootAttributes, apiParam) {
  const rootFilter = parseAndValidateFromApi(apiParam);

  function recursivelyConvert(filter) {
    const fields = filter.field
      ? getExpandedFields(savedObjectTypes, rootAttributes, filter.field)
      : undefined;

    switch (filter.type) {
      case 'value': {
        return {
          multi_match: {
            type: 'phrase',
            query: filter.value,
            fields,
          }
        };
      }

      case 'range': {
        const filters = fields.map(field => ({
          range: {
            [field]: {
              gt: filter.gt,
              gte: filter.gte,
              lt: filter.lt,
              lte: filter.lte,
            }
          }
        }));

        if (filters.length > 1) {
          return {
            bool: {
              should: filters
            }
          };
        }

        return filters[0];
      }

      case 'bool':
        return {
          bool: {
            must: filter.must.map(recursivelyConvert),
            must_not: filter.must_not.map(recursivelyConvert),
            should: filter.must_some.map(recursivelyConvert),
          }
        };

      default:
        throw new Error(`unexpected filter.type "${filter.type}"`);
    }
  }

  return recursivelyConvert(rootFilter);
}
