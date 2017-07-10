import _ from 'lodash';

export class FieldFormatsService {
  constructor(fieldFormatClasses, getConfig) {
    this._fieldFormats = _.indexBy(fieldFormatClasses, 'id');
    this.getConfig = getConfig;
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {String} fieldType - the field type
   * @return {String}
   */
  getDefaultConfig(fieldType) {
    const defaultMap = this.getConfig('format:defaultTypeMap');
    return defaultMap[fieldType] || defaultMap._default_;
  }

  /**
   * Get the default fieldFormat instance for a field type.
   *
   * @param  {String} fieldType
   * @return {FieldFormat}
   */
  getDefaultInstance(fieldType) {
    const conf = this.getDefaultConfig(fieldType);
    const FieldFormat = this._fieldFormats[conf.id];
    return new FieldFormat(conf.params, this.getConfig);
  }

  /**
   * Get the fieldFormat instance for a field format configuration.
   *
   * @param  {Object} conf:id, conf:params
   * @return {FieldFormat}
   */
  getInstance(conf) {
    const FieldFormat = this._fieldFormats[conf.id];
    return new FieldFormat(conf.params, this.getConfig);
  }

  /**
   * Get a FieldFormat type (class) by it's id.
   *
   * @param  {String} fieldFormatId - the FieldFormat id
   * @return {FieldFormat}
   */
  getType(fieldFormatId) {
    return this._fieldFormats[fieldFormatId];
  }
}
