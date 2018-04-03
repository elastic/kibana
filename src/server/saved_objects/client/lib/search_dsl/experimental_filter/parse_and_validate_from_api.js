import Boom from 'boom';

import { formatListAsProse } from '../../../../../../utils';
import { SCHEMAS } from './schemas';

const TYPES_BY_KEY = {
  field: ['value', 'range'],
  value: ['value'],
  lt: ['range'],
  lte: ['range'],
  gt: ['range'],
  gte: ['range'],
  must: ['bool'],
  must_not: ['bool'],
  must_some: ['bool'],
};

const VALID_FILTER_KEYS = formatListAsProse(Object.keys(TYPES_BY_KEY));

function keysAsProse(keys) {
  return `${keys.length > 1 ? 'properties' : 'property'} ${formatListAsProse(keys.map(k => `"${k}"`))}`;
}

export function parseAndValidateFromApi(apiParam) {
  const type = getType(apiParam);
  const { error, value: filter } = SCHEMAS[type].validate(apiParam);

  if (error) {
    throw Boom.boomify(error, {
      message: `Invalid ${type} filter`,
      statusCode: 400
    });
  }

  if (type !== 'bool') {
    return {
      type,
      ...filter
    };
  }

  return {
    type: 'bool',
    ...filter,
    must: (filter.must || []).map(parseAndValidateFromApi),
    must_not: (filter.must_not || []).map(parseAndValidateFromApi),
    must_some: (filter.must_some || []).map(parseAndValidateFromApi),
  };
}

function getType(filter) {
  const keys = Object.keys(filter);
  let possibleTypes;

  // map each of the keys in the filter to a list of possible
  // filter types and narrow the list down for each key, verifying
  // that the key is both known and that it is a valid key to
  // be combined with the others
  for (const [i, key] of keys.entries()) {
    // unknown key
    if (!TYPES_BY_KEY.hasOwnProperty(key)) {
      throw Boom.badRequest(`Unknown filter property "${key}", valid options are ${VALID_FILTER_KEYS}`);
    }

    // shortcut for first key
    if (!possibleTypes) {
      possibleTypes = TYPES_BY_KEY[key];
      continue;
    }

    // filter the list of possible types to the intersection
    // of the existing possible types and the types possible
    // for this key
    possibleTypes = possibleTypes
      .filter(t => TYPES_BY_KEY[key].includes(t));

    // attempt to be helpful if a key causes the list of
    // possible types to empty
    if (possibleTypes.length === 0) {
      throw Boom.badRequest(
        `Filter property "${key}" can't be used with ${keysAsProse(keys.slice(0, i))}`
      );
    }
  }

  if (possibleTypes.length > 1) {
    throw Boom.badRequest(
      `Unable to determine filter type when only specifying ${keysAsProse(keys)}`
    );
  }

  return possibleTypes[0];
}
