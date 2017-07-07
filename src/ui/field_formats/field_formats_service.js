export class FieldFormatsService {
  constructor() {
    this.fieldFormats = new Map();
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {String} fieldType - the field type
   * @param  {Func} getConfig
   * @return {String}
   */
  getDefaultConfig(fieldType, getConfig) {
    const defaultMap = getConfig('format:defaultTypeMap');
    return defaultMap[fieldType] || defaultMap._default_;
  }

  /**
   * Get the default fieldFormat instance for a field type.
   *
   * @param  {String} fieldType
   * @param  {Func} getConfig
   * @return {FieldFormat}
   */
  getDefaultInstance(fieldType, getConfig) {
    const conf = this.getDefaultConfig(fieldType, getConfig);
    const FieldFormat = this.fieldFormats.get(conf.id);
    return new FieldFormat(conf.params, getConfig);
  }

  /**
   * Get a FieldFormat type (class) by it's id.
   *
   * @param  {String} fieldFormatId - the FieldFormat id
   * @return {FieldFormat}
   */
  getType(fieldFormatId) {
    return this.fieldFormats.get(fieldFormatId);
  }

  register(FieldFormat) {
    this.fieldFormats.set(FieldFormat.id, FieldFormat);
  }
}
