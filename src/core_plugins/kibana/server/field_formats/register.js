import { UrlFormat } from '../../common/field_formats/types/url';
import { BytesFormat } from '../../common/field_formats/types/bytes';
import { DateFormat } from '../../common/field_formats/types/date';
import { DurationFormat } from '../../common/field_formats/types/duration';
import { IpFormat } from '../../common/field_formats/types/ip';
import { NumberFormat } from '../../common/field_formats/types/number';
import { PercentFormat } from '../../common/field_formats/types/percent';
import { StringFormat } from '../../common/field_formats/types/string';
import { SourceFormat } from '../../common/field_formats/types/source';
import { ColorFormat } from '../../common/field_formats/types/color';
import { TruncateFormat } from '../../common/field_formats/types/truncate';
import { BoolFormat } from '../../common/field_formats/types/boolean';

export function registerFieldFormats(server) {
  server.registerFieldFormatClass(UrlFormat);
  server.registerFieldFormatClass(BytesFormat);
  server.registerFieldFormatClass(DateFormat);
  server.registerFieldFormatClass(DurationFormat);
  server.registerFieldFormatClass(IpFormat);
  server.registerFieldFormatClass(NumberFormat);
  server.registerFieldFormatClass(PercentFormat);
  server.registerFieldFormatClass(StringFormat);
  server.registerFieldFormatClass(SourceFormat);
  server.registerFieldFormatClass(ColorFormat);
  server.registerFieldFormatClass(TruncateFormat);
  server.registerFieldFormatClass(BoolFormat);
}
