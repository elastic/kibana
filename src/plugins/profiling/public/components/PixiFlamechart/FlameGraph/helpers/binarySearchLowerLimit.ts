/**
 * A binary search implementation. It is a bit astonishing that JS does not come with one out of
 * the box. Uses a "getter" callback that returns a numeric value.
 * min and max are the minimal and maximal dereferencable values.
 *
 * @param at "getter" callback that returns a numeric value
 * @param target
 * @param min minimal dereferencable values
 * @param max maximal dereferencable values
 *
 * @returns the "insertion index": The index into the array where inserting "target" would keep the
 * array sorted. This means that at(index) >= target and at(index-1) < target. The minimum value
 * that can be returned is 0 and the maximum value that can be returned is maxIndex+1.
 */
export const binarySearchLowerLimit = (
  at : ((index : number) => number),
  target : number,
  min : number,
  max : number) : number => {

  while(min < max) {
    const mid = Math.floor((min+max) / 2);
    const value = at(mid);

    if (target > value) {
      min = mid + 1;
    } else if (target <= value) {
      max = mid;
    }
  }

  return min;
}