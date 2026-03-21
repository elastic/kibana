export type Frequency = 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type Field = 'second' | 'minute' | 'hour' | 'day' | 'date' | 'month';
export type FieldToValueMap = {
    [key in Field]?: string;
};
