export function RangeKeyProvider() {

  const id = Symbol('id');

  class RangeKey {
    constructor(bucket) {
      this.gte = bucket.from == null ? -Infinity : bucket.from;
      this.lt = bucket.to == null ? +Infinity : bucket.to;

      this[id] = RangeKey.idBucket(bucket);
    }


    static idBucket(bucket) {
      return `from:${bucket.from},to:${bucket.to}`;
    }

    toString() {
      return this[id];
    }
  }


  return RangeKey;
}
