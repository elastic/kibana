import { createHash } from 'crypto';
import { createReadStream } from 'fs';

import Rx from 'rxjs/Rx';

const $fromEvent = Rx.Observable.fromEvent;
const $throw = Rx.Observable.throw;

/**
 *  Get the hash of a file via a file descriptor
 *  @param  {LruCache} cache
 *  @param  {string} path
 *  @param  {Fs.Stat} stat
 *  @param  {Fs.FileDescriptor} fd
 *  @return {Promise<string>}
 */
export async function getFileHash(cache, path, stat, fd) {
  const key = `${path}:${stat.ino}:${stat.size}:${stat.mtime.getTime()}`;

  const cached = cache.get(key);
  if (cached) {
    return await cached;
  }

  const hash = createHash('sha1');
  const read = createReadStream(null, {
    fd,
    start: 0,
    autoClose: false
  });

  const promise = $fromEvent(read, 'data')
    .merge($fromEvent(read, 'error').mergeMap($throw))
    .takeUntil($fromEvent(read, 'end'))
    .forEach(chunk => hash.update(chunk))
    .then(() => hash.digest('hex'))
    .catch((error) => {
      // don't cache failed attempts
      cache.del(key);
      throw error;
    });

  cache.set(key, promise);
  return await promise;
}
