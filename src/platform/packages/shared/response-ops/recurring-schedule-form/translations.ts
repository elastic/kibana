/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Moment } from 'moment';
import { Frequency } from '@kbn/rrule';
import { monthDayDate } from './utils/month_day_date';

export const RECURRING_SCHEDULE_FORM_TIMEZONE = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.timezone',
  {
    defaultMessage: 'Time zone',
  }
);

export const RECURRING_SCHEDULE_FORM_REPEAT = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.repeat',
  {
    defaultMessage: 'Repeat',
  }
);

export const RECURRING_SCHEDULE_FORM_FREQUENCY_DAILY = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.frequency.daily',
  {
    defaultMessage: 'Daily',
  }
);

export const RECURRING_SCHEDULE_FORM_FREQUENCY_WEEKLY = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.frequency.weekly',
  {
    defaultMessage: 'Weekly',
  }
);

export const RECURRING_SCHEDULE_FORM_FREQUENCY_WEEKLY_ON = (dayOfWeek: string) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.weeklyOnWeekday', {
    defaultMessage: 'Weekly on {dayOfWeek}',
    values: { dayOfWeek },
  });

export const RECURRING_SCHEDULE_FORM_FREQUENCY_MONTHLY = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.frequency.monthly',
  {
    defaultMessage: 'Monthly',
  }
);

export const RECURRING_SCHEDULE_FORM_FREQUENCY_NTH_WEEKDAY = (dayOfWeek: string) => [
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.last', {
    defaultMessage: 'Monthly on the last {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.first', {
    defaultMessage: 'Monthly on the first {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.second', {
    defaultMessage: 'Monthly on the second {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.third', {
    defaultMessage: 'Monthly on the third {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.fourth', {
    defaultMessage: 'Monthly on the fourth {dayOfWeek}',
    values: { dayOfWeek },
  }),
];

export const RECURRING_SCHEDULE_FORM_FREQUENCY_YEARLY = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.frequency.yearly',
  {
    defaultMessage: 'Yearly',
  }
);

export const RECURRING_SCHEDULE_FORM_FREQUENCY_YEARLY_ON = (startDate: Moment) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.frequency.yearlyOn', {
    defaultMessage: 'Yearly on {date}',
    values: {
      date: monthDayDate(startDate),
    },
  });

export const RECURRING_SCHEDULE_FORM_FREQUENCY_CUSTOM = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.frequency.custom',
  {
    defaultMessage: 'Custom',
  }
);

export const RECURRING_SCHEDULE_FORM_ENDS = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.endsLabel',
  {
    defaultMessage: 'End',
  }
);

export const RECURRING_SCHEDULE_FORM_ENDS_NEVER = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.ends.never',
  {
    defaultMessage: 'Never',
  }
);

export const RECURRING_SCHEDULE_FORM_ENDS_ON_DATE = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.ends.onDate',
  {
    defaultMessage: 'On date',
  }
);

export const RECURRING_SCHEDULE_FORM_ENDS_AFTER_X = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.ends.afterX',
  {
    defaultMessage: `After '{x}'`,
  }
);

export const RECURRING_SCHEDULE_FORM_COUNT_AFTER = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.count.after',
  {
    defaultMessage: 'After',
  }
);

export const RECURRING_SCHEDULE_FORM_COUNT_OCCURRENCE = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.count.occurrence',
  {
    defaultMessage: 'occurrence',
  }
);

export const RECURRING_SCHEDULE_FORM_COUNT_REQUIRED = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.countFieldRequiredError',
  {
    defaultMessage: 'A count is required.',
  }
);

export const RECURRING_SCHEDULE_FORM_INTERVAL_REQUIRED = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.intervalFieldRequiredError',
  {
    defaultMessage: 'An interval is required.',
  }
);

export const RECURRING_SCHEDULE_FORM_INTERVAL_EVERY = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.interval.every',
  {
    defaultMessage: 'Every',
  }
);

export const RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY_DAILY = (interval: number) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.customFrequency.daily', {
    defaultMessage: '{interval, plural, one {day} other {days}}',
    values: { interval },
  });

export const RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY_WEEKLY = (interval: number) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.customFrequency.weekly', {
    defaultMessage: '{interval, plural, one {week} other {weeks}}',
    values: { interval },
  });

export const RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY_MONTHLY = (interval: number) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.customFrequency.monthly', {
    defaultMessage: '{interval, plural, one {month} other {months}}',
    values: { interval },
  });

export const RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY_YEARLY = (interval: number) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.customFrequency.yearly', {
    defaultMessage: '{interval, plural, one {year} other {years}}',
    values: { interval },
  });

export const RECURRING_SCHEDULE_FORM_WEEKDAY_SHORT = (dayOfWeek: string) => [
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.lastShort', {
    defaultMessage: 'On the last {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.firstShort', {
    defaultMessage: 'On the 1st {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.secondShort', {
    defaultMessage: 'On the 2nd {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.thirdShort', {
    defaultMessage: 'On the 3rd {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.fourthShort', {
    defaultMessage: 'On the 4th {dayOfWeek}',
    values: { dayOfWeek },
  }),
];

export const RECURRING_SCHEDULE_FORM_BYWEEKDAY_REQUIRED = i18n.translate(
  'xpack.alerting.maintenanceWindows.createForm.byweekdayFieldRequiredError',
  {
    defaultMessage: 'A week day is required.',
  }
);

export const RECURRING_SCHEDULE_FORM_CUSTOM_REPEAT_MONTHLY_ON_DAY = (startDate: Moment) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.repeatOnMonthlyDay', {
    defaultMessage: 'On day {dayNumber}',
    values: { dayNumber: startDate.date() },
  });

export const RECURRING_SCHEDULE_FORM_RECURRING_SUMMARY_PREFIX = (summary: string) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.recurringSummaryPrefix', {
    defaultMessage: 'Repeats {summary}',
    values: { summary },
  });

export const RECURRING_SCHEDULE_FORM_FREQUENCY_SUMMARY = (interval: number) => ({
  [Frequency.DAILY]: i18n.translate('xpack.alerting.maintenanceWindows.createForm.daySummary', {
    defaultMessage: '{interval, plural, one {day} other {# days}}',
    values: { interval },
  }),
  [Frequency.WEEKLY]: i18n.translate('xpack.alerting.maintenanceWindows.createForm.weekSummary', {
    defaultMessage: '{interval, plural, one {week} other {# weeks}}',
    values: { interval },
  }),
  [Frequency.MONTHLY]: i18n.translate('xpack.alerting.maintenanceWindows.createForm.monthSummary', {
    defaultMessage: '{interval, plural, one {month} other {# months}}',
    values: { interval },
  }),
  [Frequency.YEARLY]: i18n.translate('xpack.alerting.maintenanceWindows.createForm.yearSummary', {
    defaultMessage: '{interval, plural, one {year} other {# years}}',
    values: { interval },
  }),
});

export const RECURRING_SCHEDULE_FORM_UNTIL_DATE_SUMMARY = (date: string) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.untilDateSummary', {
    defaultMessage: 'until {date}',
    values: { date },
  });

export const RECURRING_SCHEDULE_FORM_OCURRENCES_SUMMARY = (count: number) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.occurrencesSummary', {
    defaultMessage: 'for {count, plural, one {# occurrence} other {# occurrences}}',
    values: { count },
  });

export const RECURRING_SCHEDULE_FORM_RECURRING_SUMMARY = (
  frequencySummary: string | null,
  onSummary: string | null,
  untilSummary: string | null
) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.recurrenceSummary', {
    defaultMessage: 'every {frequencySummary}{on}{until}',
    values: {
      frequencySummary: frequencySummary ? `${frequencySummary} ` : '',
      on: onSummary ? `${onSummary} ` : '',
      until: untilSummary ? `${untilSummary}` : '',
    },
  });

export const RECURRING_SCHEDULE_FORM_WEEKLY_SUMMARY = (weekdays: string) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.weeklySummary', {
    defaultMessage: 'on {weekdays}',
    values: {
      weekdays,
    },
  });

export const RECURRING_SCHEDULE_FORM_MONTHLY_BY_DAY_SUMMARY = (monthday: number) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.monthlyByDaySummary', {
    defaultMessage: 'on day {monthday}',
    values: {
      monthday,
    },
  });

export const RECURRING_SCHEDULE_FORM_YEARLY_BY_MONTH_SUMMARY = (date: string) =>
  i18n.translate('xpack.alerting.maintenanceWindows.createForm.yearlyBymonthSummary', {
    defaultMessage: 'on {date}',
    values: { date },
  });
