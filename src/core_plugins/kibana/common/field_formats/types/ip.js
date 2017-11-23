export function createIpFormat(FieldFormat) {
  return class IpFormat extends FieldFormat {
    _convert(val) {
      if (val === undefined || val === null) return '-';
      if (!isFinite(val)) return val;

      // shazzam!
      return [val >>> 24, val >>> 16 & 0xFF, val >>> 8 & 0xFF, val & 0xFF].join('.');
    }

    static id = 'ip';
    static title = 'IP Address';
    static fieldType = 'ip';
  };
}
