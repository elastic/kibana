import { has } from 'lodash';

export const copyField = (field, indexPattern, Field) => {
  const changes = {};
  const shadowProps = {
    toActualField: {
      // bring the shadow copy out of the shadows
      value: () => {
        return new Field(indexPattern, {
          ...changes,
          ...field.$$spec
        });
      }
    }
  };

  Object.getOwnPropertyNames(field).forEach(function (prop) {
    const desc = Object.getOwnPropertyDescriptor(field, prop);
    shadowProps[prop] = {
      enumerable: desc.enumerable,
      get: function () {
        return has(changes, prop) ? changes[prop] : field[prop];
      },
      set: function (v) {
        changes[prop] = v;
      }
    };
  });

  return Object.create(null, shadowProps);
};
