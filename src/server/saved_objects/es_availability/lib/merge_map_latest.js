import { Observable } from 'rxjs/Rx';

export const mergeMapLatest = (mapFn) => (source) => (
  source.lift({
    call(observer, source) {
      let buffer = null;

      const sub = observer.add(source.subscribe({
        // either start or buffer each value
        next(value) {
          if (!buffer) {
            mapValue(value);
            return;
          }

          buffer.unshift(value);
          buffer.length = 1; // cap the buffer size to 1
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          // if we are buffering it's not our job to signal complete
          if (!buffer) {
            observer.complete();
          }
        },
      }));

      function mapValue(value) {
        // tells source sub to start buffering items, and that
        // we will take care of completing when we are done
        if (!buffer) {
          buffer = [];
        }

        observer.add(Observable.from(mapFn(value)).subscribe({
          next(mappedValue) {
            observer.next(mappedValue);
          },
          error(error) {
            observer.error(error);
          },
          complete() {
            if (buffer.length) {
              mapValue(buffer.shift());
              return;
            }

            if (sub.closed) {
              observer.complete();
            }

            buffer = null;
          }
        }));
      }
    }
  })
);
