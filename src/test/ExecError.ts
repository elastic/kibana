import { SignalConstants } from 'os';

export class ExecError extends Error {
  code: number | undefined;
  cmd: string | undefined;
  stdout: string | undefined;
  stderr: string | undefined;
  constructor(error: {
    cmd?: string;
    killed?: boolean;
    code?: number;
    signal?: SignalConstants | null;
    stdout?: string;
    stderr?: string;
  }) {
    super(error.stderr);
    this.name = 'ExecError';
    this.code = error.code;
    this.cmd = error.cmd;
    this.stdout = error.stdout;
    this.stderr = error.stderr;
    Error.captureStackTrace(this, ExecError);
  }
}
