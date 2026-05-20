import { DateNanosFormat } from '../../../common/converters/date_nanos_shared';
import type { TextContextTypeConvert } from '../../../common/types';
declare class DateNanosFormatServer extends DateNanosFormat {
    textConvert: TextContextTypeConvert;
}
export { DateNanosFormatServer as DateNanosFormat };
