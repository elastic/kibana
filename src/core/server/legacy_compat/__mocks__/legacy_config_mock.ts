/**
 * This is a partial mock of src/server/config/config.js.
 */
export class LegacyConfigMock {
  public readonly set = jest.fn((key, value) => {
    // Real legacy config throws error if key is not presented in the schema.
    if (!this.rawData.has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    this.rawData.set(key, value);
  });

  public readonly get = jest.fn(key => {
    // Real legacy config throws error if key is not presented in the schema.
    if (!this.rawData.has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    return this.rawData.get(key);
  });

  public readonly has = jest.fn(key => this.rawData.has(key));

  constructor(public rawData: Map<string, any> = new Map()) {}
}
