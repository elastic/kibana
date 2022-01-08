import { Commit } from './sourceCommit/parseSourceCommit';

type Meta = {
  type: 'merge-conflict-due-to-missing-backports';
  commitsWithoutBackports: {
    formatted: string;
    commit: Commit;
  }[];
};

export class HandledError extends Error {
  meta?: Meta;
  constructor(message: string, meta?: Meta) {
    super(message);
    Error.captureStackTrace(this, HandledError);
    this.name = 'HandledError';
    this.meta = meta;
  }
}
