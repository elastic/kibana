import { ObservableError } from './observable_error';

export class EmptyError extends ObservableError {
  constructor(producer: string) {
    super(
      'KBN$_EMPTY_ERROR',
      `EmptyError: ${producer} requires source observable to emit at least one value.`,
      EmptyError
    );
  }
}
