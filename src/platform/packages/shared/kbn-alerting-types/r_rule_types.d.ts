import type { WeekdayStr, Options } from '@kbn/rrule';
export type RRuleParams = Partial<RRuleRecord> & Pick<RRuleRecord, 'dtstart' | 'tzid'>;
export type RRuleRecord = Omit<Options, 'dtstart' | 'byweekday' | 'wkst' | 'until'> & {
    dtstart: string;
    byweekday?: Array<WeekdayStr | string | number> | null;
    wkst?: WeekdayStr;
    until?: string;
};
