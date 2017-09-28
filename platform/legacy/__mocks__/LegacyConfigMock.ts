export class LegacyConfigMock {
  readonly get: jest.Mock<any>;
  readonly set: jest.Mock<void>;
  readonly has: jest.Mock<boolean>;

  constructor(public __rawData: Map<string, any> = new Map()) {
    this.get = jest.fn(key => {
      // Real legacy config throws error if key is not presented in the schema.
      if (!this.__rawData.has(key)) {
        throw new TypeError(`Unknown schema key: ${key}`);
      }

      return this.__rawData.get(key);
    });

    this.set = jest.fn((key, value) => {
      // Real legacy config throws error if key is not presented in the schema.
      if (!this.__rawData.has(key)) {
        throw new TypeError(`Unknown schema key: ${key}`);
      }

      this.__rawData.set(key, value);
    });

    this.has = jest.fn(key => this.__rawData.has(key));
  }
}
