import getSeries from '../helpers/get_series';
import getSeriesList from '../helpers/get_series_list';
import _ from 'lodash';

module.exports = function (name, data) {
  return getSeriesList([getSeries(name, _.map(data, 0), _.map(data, 1))]);
};
