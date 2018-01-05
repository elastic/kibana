import { asPrettyString } from '../../utils/as_pretty_string';

export function createBoolFormat(FieldFormat) {
  return class BoolFormat extends FieldFormat {
    _convert(value) {
      if (typeof value === 'string') {
        value = value.trim().toLowerCase();
      }

      switch (value) {
        case false:
        case 0:
        case 'false':
        case 'no':
          return 'false';
        case true:
        case 1:
        case 'true':
        case 'yes':
          return 'true';
        default:
          return asPrettyString(value);
      }
    }

    static id = 'boolean';
    static title = 'Boolean';
    static fieldType = ['boolean', 'number', 'string'];
  };
}
