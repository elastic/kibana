import dateMath from '@kbn/datemath';
export const GTE_INTERVAL_RE = new RegExp(`^>=([\\d\\.]*\\s*(${dateMath.units.join('|')}))$`);
export const INTERVAL_STRING_RE = new RegExp('^([0-9\\.]*)\\s*(' + dateMath.units.join('|') + ')$');

