import { parseAndValidateFromApi } from './parse_and_validate_from_api';

export function convertFilterToEsDsl(types, apiParam) {
  return convertFilter(types, parseAndValidateFromApi(apiParam));
}

function getFilterFields(types, field) {
  switch (field) {
    case 'type':
    case 'updated_at':
      return [field];

    default:
      return types.reduce((acc, t) => [
        ...acc,
        `${t}.${field}`
      ], []);
  }
}

function convertFilter(types, filter) {
  switch (filter.type) {
    case 'value': {
      return {
        multi_match: {
          type: 'phrase',
          query: filter.value,
          fields: filter.field
            ? getFilterFields(types, filter.field)
            : undefined,
        }
      };
    }

    case 'range': {
      const filters = getFilterFields(types, filter.field).map(field => ({
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
          must: filter.must.map(filter => convertFilter(types, filter)),
          must_not: filter.must_not.map(filter => convertFilter(types, filter)),
          should: filter.must_some.map(filter => convertFilter(types, filter)),
        }
      };

    default:
      throw new Error(`unexpected filter.type "${filter.type}"`);
  }
}
