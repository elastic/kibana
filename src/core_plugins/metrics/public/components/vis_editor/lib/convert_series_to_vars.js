import _ from 'lodash';
import { getLastValue } from '../../../visualizations/lib';
import tickFormatter from '../../../lib/tick_formatter';
import moment from 'moment';
import calculateLabel from './calculate_label';
export default (series, model) => {
  const variables = {};
  model.series.forEach(seriesModel => {
    series
      .filter(row => _.startsWith(row.id, seriesModel.id))
      .forEach(row => {
        const metric = _.last(seriesModel.metrics);

        const varName = [
          _.snakeCase(row.label),
          _.snakeCase(seriesModel.var_name)
        ].filter(v => v).join('.');

        const formatter = tickFormatter(seriesModel.formatter, seriesModel.value_template);
        const lastValue = getLastValue(row.data, 10);

        const data = {
          last: {
            raw: lastValue,
            formatted: formatter(lastValue)
          },
          data: {
            raw: row.data,
            formatted: row.data.map(point => {
              return [moment(point[0]).format('lll'), formatter(point[1])];
            })
          }
        };
        _.set(variables, varName, data);
        _.set(variables, `${_.snakeCase(row.label)}.label`, row.label);

      });
  });
  return variables;

};
