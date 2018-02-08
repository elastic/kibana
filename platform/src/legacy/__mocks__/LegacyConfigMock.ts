/**
 * This is a partial mock of src/server/config/config.js.
 */
export class LegacyConfigMock {
  constructor(public __rawData: Map<string, any> = new Map()) {}

  readonly set = jest.fn((key, value) => {
    // Real legacy config throws error if key is not presented in the schema.
    if (!this.__rawData.has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    this.__rawData.set(key, value);
  });

  readonly get = jest.fn(key => {
    // Real legacy config throws error if key is not presented in the schema.
    if (!this.__rawData.has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    return this.__rawData.get(key);
  });

  readonly has = jest.fn(key => this.__rawData.has(key));
}
