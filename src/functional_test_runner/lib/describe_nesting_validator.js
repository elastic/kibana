/**
 *  Creates an object that enables us to intercept all calls to mocha
 *  interface functions `describe()`, `before()`, etc. and ensure that:
 *
 *    - all calls are made within a `describe()`
 *    - there is only one top-level `describe()`
 *
 *  To do this we create a proxy to another object, `context`. Mocha
 *  interfaces will assign all of their exposed methods on this Proxy
 *  which will wrap all functions with checks for the above rules.
 *
 *  @return {any} the context that mocha-ui interfaces will assign to
 */
export function createDescribeNestingValidator(context) {
  let describeCount = 0;
  let describeLevel = 0;

  function createContextProxy() {
    return new Proxy(context, {
      set(target, property, value) {
        return Reflect.set(target, property, wrapContextAssignmentValue(property, value));
      }
    });
  }

  function wrapContextAssignmentValue(name, value) {
    if (typeof value !== 'function') {
      return value;
    }

    if (name === 'describe') {
      return createDescribeProxy(value);
    }

    return createNonDescribeProxy(name, value);
  }

  function createDescribeProxy(describe) {
    return new Proxy(describe, {
      apply(target, thisArg, args) {
        try {
          if (describeCount > 0 && describeLevel === 0) {
            throw new Error(`
              Test files must only define a single top-level suite. Please ensure that
              all calls to \`describe()\` are within a single \`describe()\` call in this file.
            `);
          }

          describeCount += 1;
          describeLevel += 1;
          return Reflect.apply(describe, thisArg, args);
        } finally {
          describeLevel -= 1;
        }
      }
    });
  }

  function createNonDescribeProxy(name, nonDescribe) {
    return new Proxy(nonDescribe, {
      apply(target, thisArg, args) {
        if (describeCount === 0) {
          throw new Error(`
            All ${name}() calls in test files must be within a describe() call.
          `);
        }

        return Reflect.apply(nonDescribe, thisArg, args);
      }
    });
  }

  return createContextProxy();
}
