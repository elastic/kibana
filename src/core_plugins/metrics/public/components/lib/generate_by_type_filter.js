import _ from 'lodash';
export default function byType(type) {
  return (field) => {
    switch (type) {
      case 'numeric':
        return _.includes([
          'number'
        ], field.type);
      case 'string':
        return _.includes([
          'string', 'keyword', 'text'
        ], field.type);
      case 'date':
        return _.includes([
          'date'
        ], field.type);
      default:
        return true;
    }
  };
}

