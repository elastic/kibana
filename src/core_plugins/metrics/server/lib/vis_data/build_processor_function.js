export default function buildProcessorFunction(chain, ...args) {
  return chain.reduceRight((next, fn) => {
    return fn(...args)(next);
  }, doc => doc);
}
