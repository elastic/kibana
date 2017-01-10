import moment from 'moment';
import mondayFirstWeekdays from 'ui/utils/monday_first_weekdays';

export default function createTermsFilterProvider(Private) {
  return function (aggConfig, key) {
    const dateMethod = aggConfig.params.date_method;
    const field = aggConfig.params.field;
    const indexPattern = aggConfig.vis.indexPattern;
    const weekdays = mondayFirstWeekdays();

    //convert date strings back into date indexes
    let value = key;
    switch (aggConfig.params.date_method) {
      case 'monthOfYear':
        value = moment.monthsShort().indexOf(key) + 1;
        break;
      case 'dayOfWeek':
        value = weekdays.indexOf(key) + 1;
        break;
    }

    return {
      meta: {
        index: indexPattern.id,
        field: field.name,
        formattedValue: dateMethod + ': ' + key
      },
      script: {
        script: {
          inline: '(doc[\'' + field.name + '\'].date.' + dateMethod + ') == value',
          lang: 'expression',
          params: {
            value: value
          }
        }
      }
    };
  };
}
