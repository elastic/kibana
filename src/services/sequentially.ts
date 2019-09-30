export function sequentially<T>(
  items: T[],
  handler: (item: T) => Promise<void>
) {
  return items.reduce(async (p, item) => {
    await p;
    return handler(item);
  }, Promise.resolve());
}
