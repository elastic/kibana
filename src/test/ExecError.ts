export class ExecError extends Error {
  code: number | undefined;
  cmd: string | undefined;
  stdout: string | undefined;
  stderr: string | undefined;
  constructor(
    public message: string,
    error: {
      cmd?: string;
      killed?: boolean;
      code?: number;
      signal?: NodeJS.Signals;
      stdout?: string;
      stderr?: string;
    }
  ) {
    super(message);
    this.name = 'ExecError';
    this.code = error.code;
    this.cmd = error.cmd;
    this.stdout = error.stdout;
    this.stderr = error.stderr;
    Error.captureStackTrace(this, ExecError);
  }
}
