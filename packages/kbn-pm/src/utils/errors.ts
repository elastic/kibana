export class CliError extends Error {
  constructor(message: string, public readonly meta = {}) {
    super(message);
  }
}
