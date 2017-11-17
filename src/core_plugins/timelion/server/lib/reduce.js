import _ from 'lodash';

/**
 * Reduces multiple arrays into a single array using a function
 * @param {Array} args - args[0] must always be a {type: 'seriesList'}
 *
 * - If only arg[0] exists, the seriesList will be reduced to a seriesList containing a single series
 * - If multiple arguments are passed, each argument will be mapped onto each series in the seriesList.

 * @params {Function} fn - Function used to combine points at same index in each array of each series in the seriesList.
 * @return {seriesList}
 */
export default async function reduce(argsPromises, fn) {
  const args = await Promise.all(argsPromises);

  const seriesList = args.shift();
  let argument = args.shift();

  if (seriesList.type !== 'seriesList') {
    throw new Error ('input must be a seriesList');
  }

  if (_.isObject(argument) && argument.type === 'seriesList') {
    if (argument.list.length > 1) {
      // ensure seriesList contain same labels
      if (seriesList.list.length !== argument.list.length) {
        throw new Error ('Unable to reduce seriesList on a per-label basis, number of series are not the same');
      }
      const indexedByLabel = _.indexBy(argument.list, 'label');
      seriesList.list.forEach((series) => {
        if (!indexedByLabel[series.label]) {
          throw new Error (`series could not be found for label ${series.label}`);
        }
      });

      // reduce seriesList on a per-label basis
      const labelwiseSeriesList = { type: 'seriesList', list: [] };
      seriesList.list.forEach(async (series) => {
        const first = { type: 'seriesList', list: [series] };
        const second = { type: 'seriesList', list: [indexedByLabel[series.label]] };
        const labelSeriesList = await reduce([first, second], fn);
        const labelSeries = labelSeriesList.list[0];
        labelwiseSeriesList.list.push(labelSeries);
      });
      return labelwiseSeriesList;
    } else {
      argument = argument.list[0];
    }
  }


  function reduceSeries(series) {
    return _.reduce(series, function (destinationObject, argument, i, p) {

      let output = _.map(destinationObject.data, function (point, index) {

        const value = point[1];

        if (value == null) {
          return [point[0], null];
        }

        if (_.isNumber(argument)) {
          return [point[0], fn(value, argument, i, p)];
        }

        if (argument.data[index] == null || argument.data[index][1] == null) {
          return [point[0], null];
        }
        return [point[0], fn(value, argument.data[index][1], i, p)];
      });

      // Output = single series

      output = {
        data: output
      };
      output = _.defaults(output, destinationObject);
      return output;

    });

  }

  let reduced;

  if (argument != null) {
    reduced = _.map(seriesList.list, function (series) {
      return reduceSeries([series].concat(argument));
    });
  } else {
    reduced = [reduceSeries(seriesList.list)];
  }

  seriesList.list = reduced;
  return seriesList;
}
