export class CliError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.meta = meta;
  }
}
