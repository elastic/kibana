import moment from 'moment';

export function FilterBarLibChangeTimeFilterProvider(timefilter) {
  return function (filter) {
    const key = Object.keys(filter.range)[0];
    const values = filter.range[key];
    timefilter.time.from = moment(values.gt || values.gte);
    timefilter.time.to = moment(values.lt || values.lte);
    timefilter.time.mode = 'absolute';
  };
}
