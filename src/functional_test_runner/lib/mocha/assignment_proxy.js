export function createAssignmentProxy(object, interceptor) {
  return new Proxy(object, {
    set(target, property, value) {
      return Reflect.set(target, property, interceptor(property, value));
    }
  });
}
