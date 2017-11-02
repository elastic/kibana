class KeystoreError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnableToReadKeystore extends KeystoreError {
  constructor(message) {
    super(message || 'unable to read keystore');
  }
}
