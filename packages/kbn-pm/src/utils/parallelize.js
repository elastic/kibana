export async function parallelizeBatches(batches, fn) {
  for (const batch of batches) {
    const running = batch.map(obj => fn(obj));

    // We need to make sure the entire batch has completed before we can move on
    // to the next batch
    await Promise.all(running);
  }
}
