export function createAssignmentProxy(object, interceptor) {
  const originalValues = new Map();

  return new Proxy(object, {
    set(target, property, value) {
      if (!originalValues.has(property)) {
        originalValues.set(property, object[property]);
      }

      return Reflect.set(target, property, interceptor(property, value));
    },

    get(target, property) {
      if (property === 'revertProxiedAssignments') {
        return function () {
          for (const [property, value] of originalValues) {
            object[property] = value;
          }
        };
      }

      return Reflect.get(target, property);
    }
  });
}
