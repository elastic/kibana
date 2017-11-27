// TODO: pointseries performs poorly, that's why we run it on the server.

import { math } from '../../common/lib/math.js';
import moment from 'moment';
import { groupBy, zipObject, uniqBy, omit, pickBy, find, uniq, map, mapValues } from 'lodash';
import { findInObject } from '../../common/lib/find_in_object';
import { pivotObjectArray } from '../../common/lib/pivot_object_array.js';

function isColumnReference(mathExpression) {
  const parsedMath = math.parse(mathExpression);
  if (parsedMath.type === 'SymbolNode') return true;
}

function isMeasure(mathScope, mathExpression) {
  if (isColumnReference(mathExpression)) return false;

  const parsedMath = math.parse(mathExpression);

  if (parsedMath.type !== 'FunctionNode' && parsedMath.type !== 'ConstantNode') {
    throw new Error ('Expressions must be wrapped in a function such as sum()');
  }

  if (parsedMath.type !== 'ConstantNode') return true;

  // This will throw if the field isn't found on scope.
  // Must be a function node!
  const evaluated = math.eval(mathExpression, mathScope);
  if (typeof evaluated !== 'number') return false;

  return true;
}

function getFieldType(columns, field) {
  if (!field) return 'null';
  const column = find(columns, { name: field });
  return column ? column.type : 'null';
}

function getType(columns, mathExpression) {
  if (isColumnReference(mathExpression)) return getFieldType(columns, mathExpression);

  const parsedMath = math.parse(mathExpression);
  const symbolNames = map(findInObject(parsedMath, (val, name) => val.type === 'SymbolNode' && name !== 'fn'), 'name');
  const symbolTypes = uniq(symbolNames.map(field => getFieldType(columns, field)));
  return (symbolTypes.length === 1) ? symbolTypes[0] : 'string';
}

export const pointseries = {
  name: 'pointseries',
  type: 'pointseries',
  help: 'Turn a datatable into a point series model. Currently we differentiate measure from dimensions by looking for a MathJS function.' +
  'If you are using MathJS, we treat that argument as a measure, otherwise it is a dimension. Dimensions are combined to create unique ' +
  'keys. Measures are then deduplicated by those keys using the specified MathJS function',
  context: {
    types: ['datatable'],
  },
  args: {
    x: {
      types: ['string', 'null'],
      help: 'The values along the X-axis',
    },
    y: {
      types: ['string', 'null'],
      help: 'The values along the y-axis',
    },
    color: {
      types: ['string', 'null'],
      help: 'An expression to use in determining the mark\'s color', // If you need categorization, transform the field.
    },
    size: {
      types: ['string', 'null'],
      help: 'For elements that support it, the size of the marks',
    },
    text: {
      types: ['string', 'null'],
      help: 'For use in charts that support it, the text to show in the mark',
    },
    // In the future it may make sense to add things like shape, or tooltip values, but I think what we have is good for now
    // The way the function below is written you can add as many arbitrary named args as you want.
  },
  fn: (context, args) => {
    const mathScope = pivotObjectArray(context.rows, context.columns.map(col => col.name));
    const dimensionNames = Object.keys(pickBy(args, val => !isMeasure(mathScope, val))).filter(arg => args[arg] != null);
    const measureNames = Object.keys(pickBy(args, val => isMeasure(mathScope, val)));
    const columns = mapValues(args, arg => {
      if (!arg) return;
      // TODO: We're setting the measure/dimension break down here, but it should probably come from the datatable right?
      return { type: getType(context.columns, arg), role: isMeasure(mathScope, arg) ? 'measure' : 'dimension', expression: arg };
    });

    const PRIMARY_KEY = '%%CANVAS_POINTSERIES_PRIMARY_KEY%%';
    const rows = context.rows.map((row, i) => Object.assign({}, row, { [PRIMARY_KEY]: i }));

    function normalizeValue(expression, value) {
      switch (getType(context.columns, expression)) {
        case 'string':
          return String(value);
        case 'number':
          return Number(value);
        case 'date':
          return moment(value).valueOf();
        default:
          return value;
      }
    }

    // Dimensions
    // Group rows by their dimension values, using the argument values and preserving the PRIMARY_KEY
    // There's probably a better way to do this
    const results = rows.reduce((acc, row, i) => {
      const newRow = dimensionNames.reduce((acc, dimension) => {
        const colName = args[dimension];
        try {
          acc[dimension] = colName ? normalizeValue(colName, math.eval(colName, mathScope)[i]) : '_all';
        } catch (e) {
          // TODO: handle invalid column names...
          acc[dimension] = '_all';
        }
        return acc;
      }, { [PRIMARY_KEY]: row[PRIMARY_KEY] });

      return Object.assign(acc, { [row[PRIMARY_KEY]]: newRow });
    }, {});

    // Measures
    // First group up all of the distinct dimensioned bits. Each of these will be reduced to just 1 value
    // for each measure
    const measureKeys = groupBy(rows, (row) => {
      const dimensions = dimensionNames.map(dimension => args[dimension] ? row[args[dimension]] : '_all');
      return dimensions.join('::%BURLAP%::');
    });

    // Then compute that 1 value for each measure
    Object.values(measureKeys).forEach(rows => {
      const subtable = { type: 'datatable', columns: context.columns, rows: rows };
      const subScope = pivotObjectArray(subtable.rows, subtable.columns.map(col => col.name));
      const measureValues = measureNames.map(measure => {
        try {
          return math.eval(args[measure], subScope);
        } catch (e) {
          return null;
        }
      });

      rows.forEach(row => {
        Object.assign(results[row[PRIMARY_KEY]], zipObject(measureNames, measureValues));
      });
    });

    // It only makes sense to uniq the rows in a point series as 2 values can not exist in the exact same place at the same time.
    const resultingRows = uniqBy(Object.values(results).map(row => omit(row, PRIMARY_KEY)), JSON.stringify);

    return {
      type: 'pointseries',
      columns: columns,
      rows: resultingRows,
    };
  },
};
