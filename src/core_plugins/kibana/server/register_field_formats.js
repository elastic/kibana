import { stringifyUrl } from '../common/field_formats/types/url';
import { stringifyBytes } from '../common/field_formats/types/bytes';
import { stringifyDate } from '../common/field_formats/types/date';
import { stringifyDuration } from '../common/field_formats/types/duration';
import { stringifyIp } from '../common/field_formats/types/ip';
import { stringifyNumber } from '../common/field_formats/types/number';
import { stringifyPercent } from '../common/field_formats/types/percent';
import { stringifyString } from '../common/field_formats/types/string';
//import { stringifySource } from '../common/field_formats/types/source';
import { stringifyColor } from '../common/field_formats/types/color';
import { stringifyTruncate } from '../common/field_formats/types/truncate';
import { stringifyBoolean } from '../common/field_formats/types/boolean';

export function registerFieldFormats(server) {
  server.fieldFormats.register(stringifyUrl());
  server.fieldFormats.register(stringifyBytes());
  server.fieldFormats.register(stringifyDate());
  server.fieldFormats.register(stringifyDuration());
  server.fieldFormats.register(stringifyIp());
  server.fieldFormats.register(stringifyNumber());
  server.fieldFormats.register(stringifyPercent());
  server.fieldFormats.register(stringifyString());
  //server.fieldFormats.register(stringifySource());
  server.fieldFormats.register(stringifyColor());
  server.fieldFormats.register(stringifyTruncate());
  server.fieldFormats.register(stringifyBoolean());
}
