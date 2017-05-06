import { relativeOptions } from '../../../../../ui/public/timepicker/relative_options';
import _ from 'lodash';
import moment from 'moment';
const unitLookup = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  M: 'months',
  y: 'years'
};
export function getAxisLabelString(interval) {
  const units = _.pluck(_.clone(relativeOptions).reverse(), 'value')
    .filter(s => /^[smhdwMy]$/.test(s));
  const duration = moment.duration(interval, 'ms');
  for (let i = 0; i < units.length; i++) {
    const as = duration.as(units[i]);
    if (Math.abs(as) > 1) {
      const unitValue = Math.round(Math.abs(as));
      const unitString = unitLookup[units[i]];
      return `per ${unitValue} ${unitString}`;
    }
  }
}
