import moment from 'moment';
export function getFormat(interval, rules, dateFormat) {
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (!rule[0] || interval >= moment.duration(rule[0])) {
      return rule[1];
    }
  }
  return dateFormat;
}

export function createXaxisFormatter(interval, rules, dateFormat) {
  return val => {
    return moment(val).format(getFormat(interval, rules, dateFormat));
  };
}

