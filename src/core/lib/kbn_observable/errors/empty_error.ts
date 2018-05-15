export class EmptyError extends Error {
  code = 'K$_EMPTY_ERROR';

  constructor(producer: string) {
    super(
      `EmptyError: ${producer} requires source stream to emit at least one value.`
    );

    // We're forching this to `any` as `captureStackTrace` is not a standard
    // property, but a v8 specific one. There are node typings that we might
    // want to use, see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/index.d.ts#L47
    (Error as any).captureStackTrace(this, EmptyError);
  }
}
