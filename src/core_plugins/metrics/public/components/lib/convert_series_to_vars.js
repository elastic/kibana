import _ from 'lodash';
import getLastValue from '../../visualizations/lib/get_last_value';
import tickFormatter from './tick_formatter';
import moment from 'moment';
export default (series, model) => {
  const variables = {};
  model.series.forEach(seriesModel => {
    series
      .filter(row => _.startsWith(row.id, seriesModel.id))
      .forEach(row => {
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
