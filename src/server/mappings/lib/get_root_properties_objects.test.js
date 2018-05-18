import { getRootPropertiesObjects } from './get_root_properties_objects';

test(`returns single object with properties`, () => {
  const mappings = {
    rootType: {
      properties: {
        foo: {
          properties: {}
        }
      }
    }
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      properties: {}
    }
  });
});

test(`returns two objects with properties`, () => {
  const mappings = {
    rootType: {
      properties: {
        foo: {
          properties: {}
        },
        bar: {
          properties: {}
        }
      }
    }
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      properties: {}
    },
    bar: {
      properties: {}
    }
  });
});

test(`excludes objects without properties`, () => {
  const mappings = {
    rootType: {
      properties: {
        foo: {
          type: 'keyword'
        }
      }
    }
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({});
});

test(`excludes two objects without properties`, () => {
  const mappings = {
    rootType: {
      properties: {
        foo: {
          type: 'keyword'
        },
        bar: {
          type: 'keyword'
        }
      }
    }
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({});
});

test(`includes one object with properties and excludes one object without properties`, () => {
  const mappings = {
    rootType: {
      properties: {
        foo: {
          properties: {}
        },
        bar: {
          type: 'keyword'
        }
      }
    }
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      properties: {}
    }
  });
});
