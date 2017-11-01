import { $create } from './create';

export const $fcb = (block) => (
  $create(observer => {
    block((error, value) => {
      if (error) {
        observer.error(error);
      } else {
        observer.next(value);
        observer.complete(observer);
      }
    });
  })
);
