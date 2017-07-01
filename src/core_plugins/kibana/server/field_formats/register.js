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
  server.fieldFormats.register(UrlFormat);
  server.fieldFormats.register(BytesFormat);
  server.fieldFormats.register(DateFormat);
  server.fieldFormats.register(DurationFormat);
  server.fieldFormats.register(IpFormat);
  server.fieldFormats.register(NumberFormat);
  server.fieldFormats.register(PercentFormat);
  server.fieldFormats.register(StringFormat);
  server.fieldFormats.register(SourceFormat);
  server.fieldFormats.register(ColorFormat);
  server.fieldFormats.register(TruncateFormat);
  server.fieldFormats.register(BoolFormat);
}
