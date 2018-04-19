/**
 *  Take an array of streams, pipe the output
 *  from each one into the next, listening for
 *  errors from any of the streams, and then resolve
 *  the promise once the final stream has finished
 *  writing/reading.
 *
 *  If the last stream is readable, it's final value
 *  will be provided as the promise value.
 *
 *  Errors emmitted from any stream will cause
 *  the promise to be rejected with that error.
 *
 *  @param  {Array<Stream>} streams
 *  @return {Promise<any>}
 */
export async function createPromiseFromStreams(streams) {
  const last = streams[streams.length - 1];

  // reject if any of the streams emits an error
  const anyStreamFailure = new Promise((resolve, reject) => {
    streams.forEach((stream, i) => {
      if (i > 0) streams[i - 1].pipe(stream);
      stream.on('error', reject);
      return stream;
    });
  });

  // resolve when the last stream has finished writing, or
  // immediately if the last stream is not writable
  const lastFinishedWriting = new Promise(resolve => {
    if (typeof last.write !== 'function') {
      resolve();
      return;
    }

    last.on('finish', resolve);
  });

  // resolve with the final value provided by the last stream
  // after the last stream has provided it, or immediately if the
  // stream is not readable
  const lastFinishedReading = new Promise(resolve => {
    if (typeof last.read !== 'function') {
      resolve();
      return;
    }

    let finalChunk;
    last.on('data', (chunk) => {
      finalChunk = chunk;
    });
    last.on('end', () => {
      resolve(finalChunk);
    });
  });

  // wait (and rethrow) the first error, or for the last stream
  // to both finish writing and providing values to read
  await Promise.race([
    anyStreamFailure,
    Promise.all([lastFinishedWriting, lastFinishedReading])
  ]);

  // return the final chunk read from the last stream
  return await lastFinishedReading;
}
