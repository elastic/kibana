import _ from 'lodash';

export default function buildProcessorTypeArray(Types) {
  return _(Types)
    .map(Type => {
      const instance = new Type();
      return {
        typeId: instance.typeId,
        title: instance.title,
        Type
      };
    })
    .compact()
    .value();
}
